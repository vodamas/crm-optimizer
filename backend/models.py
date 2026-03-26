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
