"""CRM calculation formulas per OSFI CAR 2026 Ch4-5."""

from __future__ import annotations


def ltv_to_rw(ltv: float) -> float:
    """Map LTV ratio to risk weight per OSFI CAR Ch4 residential mortgage table."""
    if ltv <= 0.50:
        return 0.20
    if ltv <= 0.60:
        return 0.25
    if ltv <= 0.70:
        return 0.30
    if ltv <= 0.80:
        return 0.40
    if ltv <= 0.90:
        return 0.50
    return 0.70


def financial_collateral_rwa(
    ead: float, rw: float, collateral_value: float, fraction: float,
    Hc: float, He: float, Hfx: float,
) -> float:
    """Comprehensive method: E* = max(0, E*(1+He) - C*fraction*(1-Hc-Hfx))."""
    c_adj = collateral_value * fraction * (1.0 - Hc - Hfx)
    e_star = max(0.0, ead * (1.0 + He) - c_adj)
    return e_star * rw


def guarantee_rwa(
    ead: float, rw_borrower: float, rw_guarantor: float,
    guarantee_value: float, fraction: float,
) -> float:
    """Substitution approach: covered portion uses guarantor RW."""
    covered = min(guarantee_value * fraction, ead)
    uncovered = ead - covered
    return covered * rw_guarantor + uncovered * rw_borrower


def netting_rwa(
    ead: float, rw: float, liability: float, add_on: float,
) -> float:
    """On-balance netting: NGR method."""
    if ead <= 0:
        return 0.0
    ngr = max(0.0, ead - liability) / ead
    e_adj = (0.4 + 0.6 * ngr) * ead
    return e_adj * rw


def real_estate_rwa(
    ead: float, rw_unsecured: float, property_value: float,
    ltv: float, fraction: float,
) -> float:
    """LTV-based RW for secured portion, unsecured RW for remainder."""
    secured = min(property_value * fraction, ead)
    unsecured = ead - secured
    rw_secured = ltv_to_rw(ltv)
    return secured * rw_secured + unsecured * rw_unsecured


def compute_exposure_rwa(
    ead: float, rw: float,
    mitigant_type: str | None = None,
    fraction: float = 0.0,
    # Financial collateral params
    collateral_value: float = 0.0,
    Hc: float = 0.0, He: float = 0.0, Hfx: float = 0.0,
    # Guarantee params
    rw_guarantor: float = 0.0, guarantee_value: float = 0.0,
    # Netting params
    liability: float = 0.0, add_on: float = 0.0,
    # Real estate params
    property_value: float = 0.0, ltv: float = 0.0,
) -> float:
    """Dispatch to the correct CRM formula based on mitigant type."""
    if mitigant_type is None or fraction <= 0:
        return ead * rw

    if mitigant_type == "financial_collateral":
        return financial_collateral_rwa(ead, rw, collateral_value, fraction, Hc, He, Hfx)
    if mitigant_type == "guarantee":
        return guarantee_rwa(ead, rw, rw_guarantor, guarantee_value, fraction)
    if mitigant_type == "netting":
        return netting_rwa(ead, rw, liability, add_on)
    if mitigant_type == "real_estate":
        return real_estate_rwa(ead, rw, property_value, ltv, fraction)

    return ead * rw
