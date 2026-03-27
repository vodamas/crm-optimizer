import type { Exposure, Mitigant, AllocationEntry, HeuristicStep } from './types';
import { ltvToRw, computeAllocationResult, financialCollateralRwa, guaranteeRwa, nettingRwa, realEstateRwa } from './crm';
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

export interface HeuristicResult {
  result: AllocationResult;
  trace: HeuristicStep[];
}

export function solveHeuristic(exposures: Exposure[], mitigants: Mitigant[]): HeuristicResult {
  const sortedExp = [...exposures].sort((a, b) => b.riskWeight - a.riskWeight || b.ead - a.ead);
  const maxRw = Math.max(...exposures.map(e => e.riskWeight), 1);
  const sortedMit = [...mitigants].sort((a, b) => mitigantEffectiveness(b, maxRw) - mitigantEffectiveness(a, maxRw));

  const remaining: Record<string, number> = {};
  for (const m of mitigants) remaining[m.id] = 1.0;

  const allocations: AllocationEntry[] = [];
  const trace: HeuristicStep[] = [];
  let stepNum = 0;

  // Pre-apply netting
  for (const m of mitigants) {
    if (m.type === 'netting' && m.nettingSetId) {
      for (const eid of m.eligibleExposureIds) {
        const exp = exposures.find(e => e.id === eid);
        allocations.push({ exposureId: eid, mitigantId: m.id, fraction: 1.0 });
        if (exp) {
          const gross = exp.ead * exp.riskWeight;
          const net = nettingRwa(exp.ead, exp.riskWeight, m.liabilityAmount ?? 0, m.addOnFactor ?? 0);
          stepNum++;
          trace.push({
            stepNumber: stepNum,
            exposureId: eid,
            mitigantId: m.id,
            reason: `Pre-apply netting set ${m.nettingSetId}: ${m.name} covers ${exp.name}`,
            rwaSaving: Math.round((gross - net) * 100) / 100,
            fraction: 1.0,
          });
        }
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

      // Compute saving
      const gross = exp.ead * exp.riskWeight;
      let newRwa = gross;
      if (mit.type === 'financial_collateral') {
        newRwa = financialCollateralRwa(exp.ead, exp.riskWeight, mit.value, frac, mit.Hc ?? 0, mit.He ?? 0, mit.Hfx ?? 0);
      } else if (mit.type === 'guarantee') {
        newRwa = guaranteeRwa(exp.ead, exp.riskWeight, mit.guarantorRiskWeight ?? 0, mit.value, frac);
      } else if (mit.type === 'real_estate') {
        newRwa = realEstateRwa(exp.ead, exp.riskWeight, mit.propertyValue ?? 0, mit.ltv ?? 1, frac);
      }

      const effectiveness = Math.round(mitigantEffectiveness(mit, maxRw) * 10) / 10;
      stepNum++;
      trace.push({
        stepNumber: stepNum,
        exposureId: exp.id,
        mitigantId: mit.id,
        reason: `RW=${(exp.riskWeight * 100).toFixed(0)}% is highest remaining; ${mit.name} (${mit.type.replace(/_/g, ' ')}) has effectiveness score ${effectiveness}`,
        rwaSaving: Math.round((gross - newRwa) * 100) / 100,
        fraction: Math.round(frac * 10000) / 10000,
      });

      allocations.push({ exposureId: exp.id, mitigantId: mit.id, fraction: Math.round(frac * 10000) / 10000 });
      remaining[mit.id] -= frac;
    }
  }

  return {
    result: computeAllocationResult(exposures, mitigants, allocations),
    trace,
  };
}
