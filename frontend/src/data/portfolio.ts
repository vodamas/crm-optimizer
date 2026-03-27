import type { Exposure, Mitigant, PortfolioPreset } from '../model/types';

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

export const PRESETS: PortfolioPreset[] = [
  {
    id: 'default',
    name: 'Default Portfolio',
    description: 'Diversified 8-exposure portfolio with all 4 mitigant types',
    exposures: EXPOSURES,
    mitigants: MITIGANTS,
  },
  {
    id: 'heavy_corporate',
    name: 'Heavy Corporate',
    description: 'Corporate-dominated book with scarce collateral — optimizer advantage',
    exposures: [
      { id: 'E1', name: 'A-rated Corp', counterparty: 'AlphaCo', assetClass: 'corporate', ead: 60, riskWeight: 0.50, grossRwa: 30 },
      { id: 'E2', name: 'BBB Corp', counterparty: 'BravoCo', assetClass: 'corporate', ead: 80, riskWeight: 1.00, grossRwa: 80 },
      { id: 'E3', name: 'BB Corp Large', counterparty: 'CharlieCo', assetClass: 'corporate', ead: 100, riskWeight: 1.50, grossRwa: 150 },
      { id: 'E4', name: 'BB Corp Medium', counterparty: 'DeltaCo', assetClass: 'corporate', ead: 55, riskWeight: 1.50, grossRwa: 82.5 },
      { id: 'E5', name: 'Unrated Corp A', counterparty: 'EchoCo', assetClass: 'corporate', ead: 40, riskWeight: 1.00, grossRwa: 40 },
      { id: 'E6', name: 'Unrated Corp B', counterparty: 'FoxtrotCo', assetClass: 'corporate', ead: 35, riskWeight: 1.00, grossRwa: 35 },
      { id: 'E7', name: 'CCC Corp', counterparty: 'GolfCo', assetClass: 'corporate', ead: 25, riskWeight: 1.50, grossRwa: 37.5 },
    ],
    mitigants: [
      { id: 'M1', name: 'Cash Deposit', type: 'financial_collateral', value: 30, Hc: 0, He: 0, Hfx: 0, eligibleExposureIds: ['E2', 'E3', 'E4', 'E5'] },
      { id: 'M2', name: 'Bank Guarantee (AA)', type: 'guarantee', value: 40, guarantorRiskWeight: 0.20, eligibleExposureIds: ['E3', 'E4', 'E7'] },
      { id: 'M3', name: 'Govt Bond Collateral', type: 'financial_collateral', value: 20, Hc: 0.02, He: 0, Hfx: 0, eligibleExposureIds: ['E2', 'E3', 'E5', 'E6'] },
    ],
  },
  {
    id: 'mortgage_book',
    name: 'Mortgage Book',
    description: 'Residential mortgage portfolio with LTV-based real estate mitigants',
    exposures: [
      { id: 'E1', name: 'Prime Mortgage A', counterparty: 'Homeowner1', assetClass: 'retail_mortgage', ead: 45, riskWeight: 0.35, grossRwa: 15.75 },
      { id: 'E2', name: 'Prime Mortgage B', counterparty: 'Homeowner2', assetClass: 'retail_mortgage', ead: 60, riskWeight: 0.35, grossRwa: 21 },
      { id: 'E3', name: 'Near-prime Mortgage', counterparty: 'Homeowner3', assetClass: 'retail_mortgage', ead: 80, riskWeight: 0.50, grossRwa: 40 },
      { id: 'E4', name: 'High-LTV Mortgage', counterparty: 'Homeowner4', assetClass: 'retail_mortgage', ead: 55, riskWeight: 0.70, grossRwa: 38.5 },
      { id: 'E5', name: 'HELOC', counterparty: 'Homeowner5', assetClass: 'retail_mortgage', ead: 30, riskWeight: 0.40, grossRwa: 12 },
      { id: 'E6', name: 'Corp Loan (unsecured)', counterparty: 'DevCo', assetClass: 'corporate', ead: 50, riskWeight: 1.00, grossRwa: 50 },
    ],
    mitigants: [
      { id: 'M1', name: 'Property A (LTV 50%)', type: 'real_estate', value: 40, propertyValue: 90, ltv: 0.50, eligibleExposureIds: ['E1'] },
      { id: 'M2', name: 'Property B (LTV 65%)', type: 'real_estate', value: 55, propertyValue: 92, ltv: 0.65, eligibleExposureIds: ['E2'] },
      { id: 'M3', name: 'Property C (LTV 80%)', type: 'real_estate', value: 70, propertyValue: 100, ltv: 0.80, eligibleExposureIds: ['E3'] },
      { id: 'M4', name: 'Property D (LTV 90%)', type: 'real_estate', value: 50, propertyValue: 61, ltv: 0.90, eligibleExposureIds: ['E4'] },
      { id: 'M5', name: 'Cash Deposit', type: 'financial_collateral', value: 15, Hc: 0, He: 0, Hfx: 0, eligibleExposureIds: ['E5', 'E6'] },
    ],
  },
  {
    id: 'concentrated',
    name: 'Concentrated Risk',
    description: '3 large exposures, 2 mitigants — dramatic shadow price demonstration',
    exposures: [
      { id: 'E1', name: 'Mega Corp Loan', counterparty: 'MegaCo', assetClass: 'corporate', ead: 200, riskWeight: 1.50, grossRwa: 300 },
      { id: 'E2', name: 'Large Bank Facility', counterparty: 'BigBank', assetClass: 'bank', ead: 150, riskWeight: 0.50, grossRwa: 75 },
      { id: 'E3', name: 'High-yield Bond', counterparty: 'YieldCo', assetClass: 'corporate', ead: 100, riskWeight: 1.50, grossRwa: 150 },
    ],
    mitigants: [
      { id: 'M1', name: 'Sovereign Guarantee', type: 'guarantee', value: 80, guarantorRiskWeight: 0.00, eligibleExposureIds: ['E1', 'E3'] },
      { id: 'M2', name: 'Cash Collateral', type: 'financial_collateral', value: 50, Hc: 0, He: 0, Hfx: 0, eligibleExposureIds: ['E1', 'E2', 'E3'] },
    ],
  },
];
