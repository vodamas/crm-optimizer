import type { OsfiReference } from '../model/types';

export const OSFI_REFS: Record<string, OsfiReference> = {
  crm_framework: {
    chapter: 'Chapter 4',
    sections: '§63-80',
    title: 'Credit Risk Mitigation Framework',
    summary: 'Overview of eligible CRM techniques, operational requirements, and the hierarchy of approaches for recognizing risk mitigation under the standardized approach.',
  },
  comprehensive_method: {
    chapter: 'Chapter 4',
    sections: '§81-118',
    title: 'Financial Collateral — Comprehensive Approach',
    summary: 'Institutions adjust both the exposure and collateral for volatility using supervisory or own-estimate haircuts. E* = max(0, E×(1+He) − C×(1−Hc−Hfx)).',
  },
  standard_haircuts: {
    chapter: 'Chapter 4',
    sections: '§93',
    title: 'Standard Supervisory Haircuts',
    summary: 'Prescribed haircut values: Cash 0%, Sovereign bonds 0.5-4% (by maturity), Corporate bonds 1-12%, Equities 15-25%, and FX mismatch 8%.',
  },
  guarantees: {
    chapter: 'Chapter 4',
    sections: '§119-141',
    title: 'Guarantees & Credit Derivatives',
    summary: 'The substitution approach: the covered portion of the exposure takes the risk weight of the guarantor/protection provider. Requirements include direct, irrevocable, unconditional coverage.',
  },
  netting: {
    chapter: 'Chapter 4',
    sections: '§36-62',
    title: 'On-Balance Sheet Netting',
    summary: 'Net exposure = (0.4 + 0.6×NGR) × Gross exposure, where NGR (Net-to-Gross Ratio) = max(0, E−L)/E. Requires legally enforceable netting agreements.',
  },
  real_estate_ltv: {
    chapter: 'Chapter 4',
    sections: '§142-170',
    title: 'Real Estate — LTV-Based Risk Weights',
    summary: 'Residential mortgage risk weights are based on LTV ratio: ≤50%→20%, ≤60%→25%, ≤70%→30%, ≤80%→40%, ≤90%→50%, >90%→70%.',
  },
  ngr_formula: {
    chapter: 'Chapter 4',
    sections: '§45',
    title: 'Net-to-Gross Ratio (NGR)',
    summary: 'NGR captures the offset benefit of bilateral netting. A lower NGR means more offsetting positions and greater capital relief. The 40% floor ensures netting never eliminates more than 60% of exposure.',
  },
  risk_weights_sa: {
    chapter: 'Chapter 4',
    sections: '§14-35',
    title: 'Standardized Approach Risk Weights',
    summary: 'Risk weights by asset class: Sovereigns 0-150% (by rating), Banks 20-150%, Corporates 20-150%, Retail mortgages LTV-based, Other retail 75%.',
  },
};
