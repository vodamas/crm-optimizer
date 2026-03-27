"""LP-based optimal CRM allocation using scipy.optimize.linprog."""

from __future__ import annotations
from typing import Tuple, Optional, List
import copy
import numpy as np
from scipy.optimize import linprog
from models import (
    Exposure, Mitigant, AllocationEntry, ExposureResult, OptimizeResponse,
    DualValues, SensitivityPoint,
)
from crm_formulas import (
    financial_collateral_rwa, guarantee_rwa, netting_rwa, real_estate_rwa, ltv_to_rw,
)


def solve_optimal(
    exposures: list[Exposure], mitigants: list[Mitigant],
) -> Tuple[OptimizeResponse, Optional[DualValues]]:
    """Minimize total portfolio RWA via linear programming.

    Returns (response, dual_values) where dual_values contains marginal
    RWA savings per unit of mitigant capacity.
    """
    n_exp = len(exposures)
    n_mit = len(mitigants)
    exp_idx = {e.id: i for i, e in enumerate(exposures)}
    mit_idx = {m.id: j for j, m in enumerate(mitigants)}

    eligible_pairs: list[tuple[int, int]] = []
    pair_to_var: dict[tuple[int, int], int] = {}
    non_netting_mitigants = [m for m in mitigants if m.type != "netting"]

    for m in non_netting_mitigants:
        j = mit_idx[m.id]
        for eid in m.eligible_exposure_ids:
            if eid in exp_idx:
                i = exp_idx[eid]
                var_idx = len(eligible_pairs)
                pair_to_var[(i, j)] = var_idx
                eligible_pairs.append((i, j))

    n_x = len(eligible_pairs)

    collateral_exposures: set[int] = set()
    for m in non_netting_mitigants:
        if m.type == "financial_collateral":
            j = mit_idx[m.id]
            for eid in m.eligible_exposure_ids:
                if eid in exp_idx:
                    collateral_exposures.add(exp_idx[eid])

    estar_map: dict[int, int] = {}
    for ci, ei in enumerate(sorted(collateral_exposures)):
        estar_map[ei] = n_x + ci
    n_estar = len(estar_map)
    n_vars = n_x + n_estar

    # Pre-apply netting
    netting_results: dict[str, float] = {}
    netting_allocations: list[AllocationEntry] = []
    for m in mitigants:
        if m.type == "netting" and m.netting_set_id:
            for eid in m.eligible_exposure_ids:
                if eid in exp_idx:
                    e = exposures[exp_idx[eid]]
                    net = netting_rwa(e.ead, e.risk_weight, m.liability_amount or 0, m.add_on_factor or 0)
                    netting_results[eid] = net
                    netting_allocations.append(AllocationEntry(
                        exposure_id=eid, mitigant_id=m.id, fraction=1.0,
                    ))

    if n_vars == 0:
        return _build_response_from_allocs(exposures, mitigants, netting_allocations, netting_results), None

    # Build objective
    c = np.zeros(n_vars)
    constant = 0.0
    for e in exposures:
        if e.id in netting_results:
            constant += netting_results[e.id]
        else:
            constant += e.ead * e.risk_weight

    for (i, j), vi in pair_to_var.items():
        m = mitigants[j]
        e = exposures[i]
        if e.id in netting_results:
            continue

        if m.type == "guarantee":
            grw = m.guarantor_risk_weight or 0.0
            saving = m.value * (e.risk_weight - grw)
            c[vi] = -saving
        elif m.type == "real_estate":
            rw_sec = ltv_to_rw(m.ltv or 1.0)
            pv = m.property_value or 0.0
            saving = pv * (e.risk_weight - rw_sec)
            c[vi] = -saving
        elif m.type == "financial_collateral":
            c[vi] = 0.0

    for ei, vi in estar_map.items():
        e = exposures[ei]
        if e.id not in netting_results:
            c[vi] = e.risk_weight
            constant -= e.ead * e.risk_weight

    # Inequality constraints
    A_rows = []
    b_rows = []

    # Track which constraint rows correspond to mitigant capacity
    capacity_constraint_indices: list[tuple[str, int]] = []  # (mitigant_id, row_index)

    # 1. Mitigant capacity: sum_i x[i,j] <= 1
    for m in non_netting_mitigants:
        j = mit_idx[m.id]
        row = np.zeros(n_vars)
        for (i2, j2), vi in pair_to_var.items():
            if j2 == j:
                row[vi] = 1.0
        capacity_constraint_indices.append((m.id, len(A_rows)))
        A_rows.append(row)
        b_rows.append(1.0)

    # 2. Coverage cap for guarantees
    for (i, j), vi in pair_to_var.items():
        m = mitigants[j]
        e = exposures[i]
        if m.type == "guarantee" and m.value > 0:
            row = np.zeros(n_vars)
            row[vi] = m.value
            A_rows.append(row)
            b_rows.append(e.ead)

    # 3. Coverage cap for real estate
    for (i, j), vi in pair_to_var.items():
        m = mitigants[j]
        e = exposures[i]
        if m.type == "real_estate" and (m.property_value or 0) > 0:
            row = np.zeros(n_vars)
            row[vi] = m.property_value or 0.0
            A_rows.append(row)
            b_rows.append(e.ead)

    # 4. E_star constraints for financial collateral
    for ei, estar_vi in estar_map.items():
        e = exposures[ei]
        if e.id in netting_results:
            continue
        row = np.zeros(n_vars)
        row[estar_vi] = -1.0
        max_he = 0.0
        for m in non_netting_mitigants:
            if m.type == "financial_collateral":
                j = mit_idx[m.id]
                if (ei, j) in pair_to_var:
                    vi = pair_to_var[(ei, j)]
                    row[vi] = -(m.value * (1.0 - m.Hc - m.Hfx))
                    max_he = max(max_he, m.He)
        A_rows.append(row)
        b_rows.append(-(e.ead * (1.0 + max_he)))

    if not A_rows:
        return _build_response_from_allocs(exposures, mitigants, netting_allocations, netting_results), None

    A_ub = np.array(A_rows)
    b_ub = np.array(b_rows)
    bounds = [(0.0, 1.0)] * n_x + [(0.0, None)] * n_estar

    result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')

    if not result.success:
        return _build_response_from_allocs(exposures, mitigants, netting_allocations, netting_results), None

    # Extract dual values for mitigant capacity constraints
    dual_values = None
    if hasattr(result, 'ineqlin') and result.ineqlin is not None:
        marginals = result.ineqlin.marginals
        if marginals is not None and len(marginals) > 0:
            mit_marginals = {}
            for mit_id, row_idx in capacity_constraint_indices:
                if row_idx < len(marginals):
                    val = float(marginals[row_idx])
                    if abs(val) > 0.001:
                        mit_marginals[mit_id] = round(val, 4)
            if mit_marginals:
                dual_values = DualValues(mitigant_marginals=mit_marginals)

    # Extract allocations
    allocs = list(netting_allocations)
    for (i, j), vi in pair_to_var.items():
        frac = result.x[vi]
        if frac > 0.001:
            allocs.append(AllocationEntry(
                exposure_id=exposures[i].id,
                mitigant_id=mitigants[j].id,
                fraction=round(frac, 4),
            ))

    return _build_response_from_allocs(exposures, mitigants, allocs, netting_results), dual_values


def solve_sensitivity_sweep(
    exposures: list[Exposure],
    mitigants: list[Mitigant],
    stress_factors: list[float],
) -> List[SensitivityPoint]:
    """Run LP with stressed haircuts for each factor and return the RWA curve."""
    points: list[SensitivityPoint] = []
    for factor in stress_factors:
        stressed = []
        for m in mitigants:
            sm = m.model_copy()
            sm.Hc = min(m.Hc * factor, 0.99)
            sm.He = min(m.He * factor, 0.99)
            sm.Hfx = min(m.Hfx * factor, 0.99)
            stressed.append(sm)
        resp, _ = solve_optimal(exposures, stressed)
        points.append(SensitivityPoint(
            stress_factor=round(factor, 2),
            total_net_rwa=resp.total_net_rwa,
        ))
    return points


def _build_response_from_allocs(
    exposures: list[Exposure],
    mitigants: list[Mitigant],
    allocations: list[AllocationEntry],
    netting_results: dict[str, float],
) -> OptimizeResponse:
    """Compute final RWA from allocation list."""
    mit_map = {m.id: m for m in mitigants}

    alloc_by_exp: dict[str, list[AllocationEntry]] = {}
    for a in allocations:
        alloc_by_exp.setdefault(a.exposure_id, []).append(a)

    per_exposure: list[ExposureResult] = []
    total_gross = 0.0
    total_net = 0.0
    by_type: dict[str, float] = {}

    for exp in exposures:
        gross_rwa = exp.ead * exp.risk_weight
        total_gross += gross_rwa

        exp_allocs = alloc_by_exp.get(exp.id, [])
        if not exp_allocs:
            per_exposure.append(ExposureResult(
                exposure_id=exp.id, gross_rwa=round(gross_rwa, 2),
                net_rwa=round(gross_rwa, 2), mitigant_ids=[],
            ))
            total_net += gross_rwa
            continue

        net_rwa = gross_rwa
        mids: list[str] = []
        for a in exp_allocs:
            m = mit_map[a.mitigant_id]
            mids.append(m.id)

            if m.type == "financial_collateral":
                new = financial_collateral_rwa(exp.ead, exp.risk_weight, m.value, a.fraction, m.Hc, m.He, m.Hfx)
                red = gross_rwa - new
            elif m.type == "guarantee":
                new = guarantee_rwa(exp.ead, exp.risk_weight, m.guarantor_risk_weight or 0, m.value, a.fraction)
                red = gross_rwa - new
            elif m.type == "netting":
                new = netting_rwa(exp.ead, exp.risk_weight, m.liability_amount or 0, m.add_on_factor or 0)
                red = gross_rwa - new
            elif m.type == "real_estate":
                new = real_estate_rwa(exp.ead, exp.risk_weight, m.property_value or 0, m.ltv or 1.0, a.fraction)
                red = gross_rwa - new
            else:
                red = 0.0

            if red > 0:
                net_rwa -= red
                by_type[m.type] = by_type.get(m.type, 0.0) + red

        net_rwa = max(0.0, net_rwa)
        total_net += net_rwa
        per_exposure.append(ExposureResult(
            exposure_id=exp.id, gross_rwa=round(gross_rwa, 2),
            net_rwa=round(net_rwa, 2), mitigant_ids=mids,
        ))

    savings = total_gross - total_net
    return OptimizeResponse(
        allocations=allocations,
        per_exposure=per_exposure,
        total_gross_rwa=round(total_gross, 2),
        total_net_rwa=round(total_net, 2),
        rwa_savings=round(savings, 2),
        rwa_savings_pct=round(savings / total_gross * 100, 2) if total_gross > 0 else 0.0,
        by_mitigant_type={k: round(v, 2) for k, v in by_type.items()},
    )
