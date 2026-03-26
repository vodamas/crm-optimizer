import type { Exposure, Mitigant, AllocationEntry, ExposureResult, AllocationResult } from './types';

export function ltvToRw(ltv: number): number {
  if (ltv <= 0.50) return 0.20;
  if (ltv <= 0.60) return 0.25;
  if (ltv <= 0.70) return 0.30;
  if (ltv <= 0.80) return 0.40;
  if (ltv <= 0.90) return 0.50;
  return 0.70;
}

export function financialCollateralRwa(
  ead: number, rw: number, collateralValue: number, fraction: number,
  Hc: number, He: number, Hfx: number,
): number {
  const cAdj = collateralValue * fraction * (1 - Hc - Hfx);
  const eStar = Math.max(0, ead * (1 + He) - cAdj);
  return eStar * rw;
}

export function guaranteeRwa(
  ead: number, rwBorrower: number, rwGuarantor: number,
  guaranteeValue: number, fraction: number,
): number {
  const covered = Math.min(guaranteeValue * fraction, ead);
  const uncovered = ead - covered;
  return covered * rwGuarantor + uncovered * rwBorrower;
}

export function nettingRwa(
  ead: number, rw: number, liability: number, _addOn: number,
): number {
  if (ead <= 0) return 0;
  const ngr = Math.max(0, ead - liability) / ead;
  const eAdj = (0.4 + 0.6 * ngr) * ead;
  return eAdj * rw;
}

export function realEstateRwa(
  ead: number, rwUnsecured: number, propertyValue: number,
  ltv: number, fraction: number,
): number {
  const secured = Math.min(propertyValue * fraction, ead);
  const unsecured = ead - secured;
  const rwSecured = ltvToRw(ltv);
  return secured * rwSecured + unsecured * rwUnsecured;
}

export function computeAllocationResult(
  exposures: Exposure[],
  mitigants: Mitigant[],
  allocations: AllocationEntry[],
): AllocationResult {
  const mitMap = new Map(mitigants.map(m => [m.id, m]));
  const allocByExp = new Map<string, AllocationEntry[]>();
  for (const a of allocations) {
    const list = allocByExp.get(a.exposureId) || [];
    list.push(a);
    allocByExp.set(a.exposureId, list);
  }

  const perExposure: ExposureResult[] = [];
  let totalGross = 0;
  let totalNet = 0;
  const byType: Record<string, number> = {};

  for (const exp of exposures) {
    const grossRwa = exp.ead * exp.riskWeight;
    totalGross += grossRwa;

    const expAllocs = allocByExp.get(exp.id) || [];
    if (expAllocs.length === 0) {
      perExposure.push({ exposureId: exp.id, grossRwa, netRwa: grossRwa, mitigantIds: [] });
      totalNet += grossRwa;
      continue;
    }

    let netRwa = grossRwa;
    const mids: string[] = [];
    for (const a of expAllocs) {
      const m = mitMap.get(a.mitigantId)!;
      mids.push(m.id);
      let reduction = 0;

      if (m.type === 'financial_collateral') {
        const newRwa = financialCollateralRwa(exp.ead, exp.riskWeight, m.value, a.fraction, m.Hc ?? 0, m.He ?? 0, m.Hfx ?? 0);
        reduction = grossRwa - newRwa;
      } else if (m.type === 'guarantee') {
        const newRwa = guaranteeRwa(exp.ead, exp.riskWeight, m.guarantorRiskWeight ?? 0, m.value, a.fraction);
        reduction = grossRwa - newRwa;
      } else if (m.type === 'netting') {
        const newRwa = nettingRwa(exp.ead, exp.riskWeight, m.liabilityAmount ?? 0, m.addOnFactor ?? 0);
        reduction = grossRwa - newRwa;
      } else if (m.type === 'real_estate') {
        const newRwa = realEstateRwa(exp.ead, exp.riskWeight, m.propertyValue ?? 0, m.ltv ?? 1, a.fraction);
        reduction = grossRwa - newRwa;
      }

      if (reduction > 0) {
        netRwa -= reduction;
        byType[m.type] = (byType[m.type] || 0) + reduction;
      }
    }

    netRwa = Math.max(0, netRwa);
    totalNet += netRwa;
    perExposure.push({ exposureId: exp.id, grossRwa, netRwa, mitigantIds: mids });
  }

  const savings = totalGross - totalNet;
  return {
    allocations,
    perExposure,
    totalGrossRwa: Math.round(totalGross * 100) / 100,
    totalNetRwa: Math.round(totalNet * 100) / 100,
    rwaSavings: Math.round(savings * 100) / 100,
    rwaSavingsPct: totalGross > 0 ? Math.round(savings / totalGross * 10000) / 100 : 0,
    byMitigantType: byType,
  };
}
