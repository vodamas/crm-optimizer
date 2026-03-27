export type AssetClass = 'sovereign' | 'bank' | 'corporate' | 'retail_mortgage' | 'retail_other';
export type MitigantType = 'financial_collateral' | 'guarantee' | 'netting' | 'real_estate';
export type CollateralSubtype = 'cash' | 'govt_bond' | 'equity';
export type AllocationMode = 'manual' | 'heuristic' | 'optimized';

export interface Exposure {
  id: string;
  name: string;
  counterparty: string;
  assetClass: AssetClass;
  ead: number;
  riskWeight: number;
  grossRwa: number;
  nettingSetId?: string;
}

export interface Mitigant {
  id: string;
  name: string;
  type: MitigantType;
  value: number;
  collateralSubtype?: CollateralSubtype;
  Hc?: number;
  He?: number;
  Hfx?: number;
  guarantorRiskWeight?: number;
  nettingSetId?: string;
  liabilityAmount?: number;
  addOnFactor?: number;
  propertyValue?: number;
  ltv?: number;
  eligibleExposureIds: string[];
}

export interface AllocationEntry {
  exposureId: string;
  mitigantId: string;
  fraction: number;
}

export interface ExposureResult {
  exposureId: string;
  grossRwa: number;
  netRwa: number;
  mitigantIds: string[];
}

export interface AllocationResult {
  allocations: AllocationEntry[];
  perExposure: ExposureResult[];
  totalGrossRwa: number;
  totalNetRwa: number;
  rwaSavings: number;
  rwaSavingsPct: number;
  byMitigantType: Record<string, number>;
}

export interface HeuristicStep {
  stepNumber: number;
  exposureId: string;
  mitigantId: string;
  reason: string;
  rwaSaving: number;
  fraction: number;
}

export interface DualValues {
  mitigantMarginals: Record<string, number>;
}

export interface SensitivityPoint {
  stressFactor: number;
  totalNetRwa: number;
}

export type AllocationMatrix = Record<string, Record<string, number>>;
// exposureId -> mitigantId -> fraction

export interface OsfiReference {
  chapter: string;
  sections: string;
  title: string;
  summary: string;
}

export interface PortfolioPreset {
  id: string;
  name: string;
  description: string;
  exposures: Exposure[];
  mitigants: Mitigant[];
}
