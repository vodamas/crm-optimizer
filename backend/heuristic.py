"""Waterfall (heuristic) CRM allocation: assign best mitigant to highest-risk exposure first."""

from __future__ import annotations
from models import Exposure, Mitigant, AllocationEntry, ExposureResult, OptimizeResponse
from crm_formulas import (
    financial_collateral_rwa, guarantee_rwa, netting_rwa, real_estate_rwa,
)


def _mitigant_effectiveness(m: Mitigant, max_rw: float) -> float:
    """Score a mitigant by how much RWA it can save per dollar of coverage."""
    if m.type == "financial_collateral":
        return m.value * (1.0 - m.Hc - m.Hfx) * max_rw
    if m.type == "guarantee":
        grw = m.guarantor_risk_weight or 0.0
        return m.value * (max_rw - grw)
    if m.type == "netting":
        return (m.liability_amount or 0.0) * max_rw * 0.6
    if m.type == "real_estate":
        from crm_formulas import ltv_to_rw
        rw_sec = ltv_to_rw(m.ltv or 1.0)
        return (m.property_value or 0.0) * (max_rw - rw_sec)
    return 0.0


def solve_heuristic(exposures: list[Exposure], mitigants: list[Mitigant]) -> OptimizeResponse:
    # Sort exposures by RW desc, EAD desc
    sorted_exp = sorted(exposures, key=lambda e: (-e.risk_weight, -e.ead))
    max_rw = max((e.risk_weight for e in exposures), default=1.0)

    # Sort mitigants by effectiveness desc
    sorted_mit = sorted(mitigants, key=lambda m: -_mitigant_effectiveness(m, max_rw))

    remaining_cap: dict[str, float] = {m.id: 1.0 for m in mitigants}
    allocations: list[AllocationEntry] = []

    # Pre-apply netting (it's not allocatable, it either applies or not)
    netting_applied: set[str] = set()
    for m in mitigants:
        if m.type == "netting" and m.netting_set_id:
            netting_applied.add(m.netting_set_id)
            for e in exposures:
                if e.id in m.eligible_exposure_ids:
                    allocations.append(AllocationEntry(
                        exposure_id=e.id, mitigant_id=m.id, fraction=1.0,
                    ))
            remaining_cap[m.id] = 0.0

    # Greedy allocation for non-netting mitigants
    for exp in sorted_exp:
        if exp.risk_weight <= 0:
            continue
        for mit in sorted_mit:
            if mit.type == "netting":
                continue
            if remaining_cap[mit.id] <= 0.001:
                continue
            if exp.id not in mit.eligible_exposure_ids:
                continue

            # How much fraction to use
            if mit.type == "financial_collateral":
                needed = exp.ead / mit.value if mit.value > 0 else 1.0
            elif mit.type == "guarantee":
                needed = exp.ead / mit.value if mit.value > 0 else 1.0
            elif mit.type == "real_estate":
                needed = exp.ead / (mit.property_value or 1.0)
            else:
                needed = 1.0

            frac = min(remaining_cap[mit.id], needed, 1.0)
            if frac < 0.001:
                continue

            allocations.append(AllocationEntry(
                exposure_id=exp.id, mitigant_id=mit.id, fraction=frac,
            ))
            remaining_cap[mit.id] -= frac

    return _build_response(exposures, mitigants, allocations)


def _build_response(
    exposures: list[Exposure],
    mitigants: list[Mitigant],
    allocations: list[AllocationEntry],
) -> OptimizeResponse:
    mit_map = {m.id: m for m in mitigants}
    exp_map = {e.id: e for e in exposures}

    # Group allocations by exposure
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
                exposure_id=exp.id, gross_rwa=gross_rwa, net_rwa=gross_rwa, mitigant_ids=[],
            ))
            total_net += gross_rwa
            continue

        # Compute net RWA considering all assigned mitigants
        net_rwa = gross_rwa
        mids: list[str] = []
        for a in exp_allocs:
            m = mit_map[a.mitigant_id]
            mids.append(m.id)

            if m.type == "financial_collateral":
                new_rwa = financial_collateral_rwa(
                    exp.ead, exp.risk_weight, m.value, a.fraction, m.Hc, m.He, m.Hfx,
                )
                reduction = gross_rwa - new_rwa
            elif m.type == "guarantee":
                new_rwa = guarantee_rwa(
                    exp.ead, exp.risk_weight, m.guarantor_risk_weight or 0.0,
                    m.value, a.fraction,
                )
                reduction = gross_rwa - new_rwa
            elif m.type == "netting":
                new_rwa = netting_rwa(
                    exp.ead, exp.risk_weight, m.liability_amount or 0.0,
                    m.add_on_factor or 0.0,
                )
                reduction = gross_rwa - new_rwa
            elif m.type == "real_estate":
                new_rwa = real_estate_rwa(
                    exp.ead, exp.risk_weight, m.property_value or 0.0,
                    m.ltv or 1.0, a.fraction,
                )
                reduction = gross_rwa - new_rwa
            else:
                reduction = 0.0

            if reduction > 0:
                net_rwa -= reduction
                by_type[m.type] = by_type.get(m.type, 0.0) + reduction

        net_rwa = max(0.0, net_rwa)
        total_net += net_rwa
        per_exposure.append(ExposureResult(
            exposure_id=exp.id, gross_rwa=gross_rwa, net_rwa=net_rwa, mitigant_ids=mids,
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
