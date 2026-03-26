import type { Exposure, Mitigant } from '../model/types';

export const EXPOSURES: Exposure[] = [
  { id: 'E1', name: 'Unrated Corp Loan A', counterparty: 'AcmeCo', assetClass: 'corporate', ead: 50, riskWeight: 1.00, grossRwa: 50 },
  { id: 'E2', name: 'Unrated Corp Loan B', counterparty: 'BetaCo', assetClass: 'corporate', ead: 30, riskWeight: 1.00, grossRwa: 30 },
  { id: 'E3', name: 'BB-rated Corp Loan',  counterparty: 'GammaCo', assetClass: 'corporate', ead: 40, riskWeight: 1.50, grossRwa: 60 },
  { id: 'E4', name: 'Bank Exposure',       counterparty: 'DeltaBank', assetClass: 'bank', ead: 25, riskWeight: 0.50, grossRwa: 12.5, nettingSetId: 'NS1' },
  { id: 'E5', name: 'Sovereign Bond',      counterparty: 'Canada', assetClass: 'sovereign', ead: 60, riskWeight: 0.00, grossRwa: 0 },
  { id: 'E6', name: 'Residential Mortgage', counterparty: 'HomeOwner1', assetClass: 'retail_mortgage', ead: 35, riskWeight: 0.40, grossRwa: 14 },
  { id: 'E7', name: 'Interbank (nettable)', counterparty: 'DeltaBank', assetClass: 'bank', ead: 20, riskWeight: 0.30, grossRwa: 6, nettingSetId: 'NS1' },
  { id: 'E8', name: 'High-risk Corp Loan', counterparty: 'OmegaCo', assetClass: 'corporate', ead: 45, riskWeight: 1.50, grossRwa: 67.5 },
];

export const MITIGANTS: Mitigant[] = [
  {
    id: 'M1', name: 'Cash Deposit', type: 'financial_collateral', value: 20,
    collateralSubtype: 'cash', Hc: 0, He: 0, Hfx: 0,
    eligibleExposureIds: ['E1', 'E2', 'E3', 'E8'],
  },
  {
    id: 'M2', name: 'Canada Govt Bond', type: 'financial_collateral', value: 15,
    collateralSubtype: 'govt_bond', Hc: 0.02, He: 0, Hfx: 0,
    eligibleExposureIds: ['E1', 'E2', 'E3', 'E4', 'E8'],
  },
  {
    id: 'M3', name: 'AAA Bank Guarantee', type: 'guarantee', value: 25,
    guarantorRiskWeight: 0.20,
    eligibleExposureIds: ['E1', 'E2', 'E3', 'E8'],
  },
  {
    id: 'M4', name: 'Bilateral Netting', type: 'netting', value: 0,
    nettingSetId: 'NS1', liabilityAmount: 15, addOnFactor: 0.4,
    eligibleExposureIds: ['E4', 'E7'],
  },
  {
    id: 'M5', name: 'Residential Property', type: 'real_estate', value: 30,
    propertyValue: 50, ltv: 0.65,
    eligibleExposureIds: ['E6'],
  },
  {
    id: 'M6', name: 'Listed Equity (TSX)', type: 'financial_collateral', value: 10,
    collateralSubtype: 'equity', Hc: 0.15, He: 0, Hfx: 0.08,
    eligibleExposureIds: ['E1', 'E2', 'E3', 'E8'],
  },
];

export const TOTAL_GROSS_RWA = EXPOSURES.reduce((s, e) => s + e.grossRwa, 0);
