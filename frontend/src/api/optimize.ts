import type { Exposure, Mitigant, AllocationResult } from '../model/types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiExposure {
  id: string; name: string; counterparty: string; asset_class: string;
  ead: number; risk_weight: number; netting_set_id?: string | null;
}

interface ApiMitigant {
  id: string; name: string; type: string; value: number;
  Hc?: number; He?: number; Hfx?: number;
  guarantor_risk_weight?: number | null;
  netting_set_id?: string | null;
  liability_amount?: number | null;
  add_on_factor?: number | null;
  property_value?: number | null;
  ltv?: number | null;
  eligible_exposure_ids: string[];
}

function toApiExposure(e: Exposure): ApiExposure {
  return {
    id: e.id, name: e.name, counterparty: e.counterparty,
    asset_class: e.assetClass, ead: e.ead, risk_weight: e.riskWeight,
    netting_set_id: e.nettingSetId ?? null,
  };
}

function toApiMitigant(m: Mitigant): ApiMitigant {
  return {
    id: m.id, name: m.name, type: m.type, value: m.value,
    Hc: m.Hc ?? 0, He: m.He ?? 0, Hfx: m.Hfx ?? 0,
    guarantor_risk_weight: m.guarantorRiskWeight ?? null,
    netting_set_id: m.nettingSetId ?? null,
    liability_amount: m.liabilityAmount ?? null,
    add_on_factor: m.addOnFactor ?? null,
    property_value: m.propertyValue ?? null,
    ltv: m.ltv ?? null,
    eligible_exposure_ids: m.eligibleExposureIds,
  };
}

interface ApiAllocationEntry { exposure_id: string; mitigant_id: string; fraction: number; }
interface ApiExposureResult { exposure_id: string; gross_rwa: number; net_rwa: number; mitigant_ids: string[]; }
interface ApiResponse {
  allocations: ApiAllocationEntry[];
  per_exposure: ApiExposureResult[];
  total_gross_rwa: number; total_net_rwa: number;
  rwa_savings: number; rwa_savings_pct: number;
  by_mitigant_type: Record<string, number>;
}

function fromApiResponse(r: ApiResponse): AllocationResult {
  return {
    allocations: r.allocations.map(a => ({ exposureId: a.exposure_id, mitigantId: a.mitigant_id, fraction: a.fraction })),
    perExposure: r.per_exposure.map(e => ({ exposureId: e.exposure_id, grossRwa: e.gross_rwa, netRwa: e.net_rwa, mitigantIds: e.mitigant_ids })),
    totalGrossRwa: r.total_gross_rwa,
    totalNetRwa: r.total_net_rwa,
    rwaSavings: r.rwa_savings,
    rwaSavingsPct: r.rwa_savings_pct,
    byMitigantType: r.by_mitigant_type,
  };
}

export async function fetchOptimization(
  exposures: Exposure[], mitigants: Mitigant[],
): Promise<{ heuristic: AllocationResult; optimized: AllocationResult }> {
  const res = await fetch(`${API_URL}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exposures: exposures.map(toApiExposure),
      mitigants: mitigants.map(toApiMitigant),
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return {
    heuristic: fromApiResponse(data.heuristic),
    optimized: fromApiResponse(data.optimized),
  };
}
