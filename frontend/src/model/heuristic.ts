import type { Exposure, Mitigant, AllocationEntry } from './types';
import { ltvToRw, computeAllocationResult } from './crm';
import type { AllocationResult } from './types';

function mitigantEffectiveness(m: Mitigant, maxRw: number): number {
  if (m.type === 'financial_collateral') {
    return m.value * (1 - (m.Hc ?? 0) - (m.Hfx ?? 0)) * maxRw;
  }
  if (m.type === 'guarantee') {
    return m.value * (maxRw - (m.guarantorRiskWeight ?? 0));
  }
  if (m.type === 'netting') {
    return (m.liabilityAmount ?? 0) * maxRw * 0.6;
  }
  if (m.type === 'real_estate') {
    const rwSec = ltvToRw(m.ltv ?? 1);
    return (m.propertyValue ?? 0) * (maxRw - rwSec);
  }
  return 0;
}

export function solveHeuristic(exposures: Exposure[], mitigants: Mitigant[]): AllocationResult {
  const sortedExp = [...exposures].sort((a, b) => b.riskWeight - a.riskWeight || b.ead - a.ead);
  const maxRw = Math.max(...exposures.map(e => e.riskWeight), 1);
  const sortedMit = [...mitigants].sort((a, b) => mitigantEffectiveness(b, maxRw) - mitigantEffectiveness(a, maxRw));

  const remaining: Record<string, number> = {};
  for (const m of mitigants) remaining[m.id] = 1.0;

  const allocations: AllocationEntry[] = [];

  // Pre-apply netting
  for (const m of mitigants) {
    if (m.type === 'netting' && m.nettingSetId) {
      for (const eid of m.eligibleExposureIds) {
        allocations.push({ exposureId: eid, mitigantId: m.id, fraction: 1.0 });
      }
      remaining[m.id] = 0;
    }
  }

  // Greedy allocation
  for (const exp of sortedExp) {
    if (exp.riskWeight <= 0) continue;
    for (const mit of sortedMit) {
      if (mit.type === 'netting') continue;
      if (remaining[mit.id] < 0.001) continue;
      if (!mit.eligibleExposureIds.includes(exp.id)) continue;

      let needed: number;
      if (mit.type === 'real_estate') {
        needed = exp.ead / (mit.propertyValue || 1);
      } else {
        needed = exp.ead / (mit.value || 1);
      }

      const frac = Math.min(remaining[mit.id], needed, 1.0);
      if (frac < 0.001) continue;

      allocations.push({ exposureId: exp.id, mitigantId: mit.id, fraction: Math.round(frac * 10000) / 10000 });
      remaining[mit.id] -= frac;
    }
  }

  return computeAllocationResult(exposures, mitigants, allocations);
}
