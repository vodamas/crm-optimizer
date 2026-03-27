from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel


class MitigantType(str, Enum):
    financial_collateral = "financial_collateral"
    guarantee = "guarantee"
    netting = "netting"
    real_estate = "real_estate"


class Exposure(BaseModel):
    id: str
    name: str
    counterparty: str
    asset_class: str
    ead: float
    risk_weight: float
    netting_set_id: Optional[str] = None


class Mitigant(BaseModel):
    id: str
    name: str
    type: MitigantType
    value: float
    Hc: float = 0.0
    He: float = 0.0
    Hfx: float = 0.0
    guarantor_risk_weight: Optional[float] = None
    netting_set_id: Optional[str] = None
    liability_amount: Optional[float] = None
    add_on_factor: Optional[float] = None
    property_value: Optional[float] = None
    ltv: Optional[float] = None
    eligible_exposure_ids: List[str] = []


class AllocationEntry(BaseModel):
    exposure_id: str
    mitigant_id: str
    fraction: float


class ExposureResult(BaseModel):
    exposure_id: str
    gross_rwa: float
    net_rwa: float
    mitigant_ids: List[str]


class OptimizeRequest(BaseModel):
    exposures: List[Exposure]
    mitigants: List[Mitigant]


class OptimizeResponse(BaseModel):
    allocations: List[AllocationEntry]
    per_exposure: List[ExposureResult]
    total_gross_rwa: float
    total_net_rwa: float
    rwa_savings: float
    rwa_savings_pct: float
    by_mitigant_type: Dict[str, float]


class HeuristicStep(BaseModel):
    step_number: int
    exposure_id: str
    mitigant_id: str
    reason: str
    rwa_saving: float
    fraction: float


class DualValues(BaseModel):
    mitigant_marginals: Dict[str, float]


class SensitivityPoint(BaseModel):
    stress_factor: float
    total_net_rwa: float


class SensitivityRequest(BaseModel):
    exposures: List[Exposure]
    mitigants: List[Mitigant]
    stress_factors: List[float]


class EnrichedOptimizeResponse(BaseModel):
    heuristic: OptimizeResponse
    optimized: OptimizeResponse
    heuristic_trace: List[HeuristicStep]
    dual_values: Optional[DualValues] = None
    allocation_matrix: Dict[str, Dict[str, Dict[str, float]]]  # mode -> exp_id -> mit_id -> frac
