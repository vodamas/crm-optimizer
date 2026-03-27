import type { AllocationResult, DualValues, Exposure, Mitigant, AllocationMatrix } from '../model/types';

interface Props {
  heuristic: AllocationResult | null;
  optimized: AllocationResult | null;
  dualValues: DualValues | null;
  exposures: Exposure[];
  mitigants: Mitigant[];
  heuristicMatrix: AllocationMatrix;
  optimizedMatrix: AllocationMatrix;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

function generateInsight(
  exposures: Exposure[], mitigants: Mitigant[],
  hMatrix: AllocationMatrix, oMatrix: AllocationMatrix,
  hResult: AllocationResult, oResult: AllocationResult,
): string[] {
  const expMap = new Map(exposures.map(e => [e.id, e]));
  const insights: string[] = [];

  // Find mitigants allocated differently
  for (const m of mitigants) {
    if (m.type === 'netting') continue;
    const hTargets: string[] = [];
    const oTargets: string[] = [];
    for (const e of exposures) {
      if ((hMatrix[e.id]?.[m.id] ?? 0) > 0.01) hTargets.push(e.id);
      if ((oMatrix[e.id]?.[m.id] ?? 0) > 0.01) oTargets.push(e.id);
    }
    if (hTargets.join(',') !== oTargets.join(',') && (hTargets.length > 0 || oTargets.length > 0)) {
      const hNames = hTargets.map(id => expMap.get(id)?.name ?? id).join(', ');
      const oNames = oTargets.map(id => expMap.get(id)?.name ?? id).join(', ');
      insights.push(
        `${m.name} (${m.id}): Heuristic assigns to [${hNames || 'none'}], Optimizer assigns to [${oNames || 'none'}].`
      );
    }
  }

  // Explain the advantage
  const diff = hResult.totalNetRwa - oResult.totalNetRwa;
  if (diff > 0.1) {
    insights.push(
      `The optimizer achieves $${fmt(diff)}M lower RWA than the heuristic by finding the globally optimal allocation across all exposures simultaneously.`
    );
  } else if (diff < -0.1) {
    insights.push(
      `The heuristic achieves $${fmt(-diff)}M lower RWA in this case. This can happen when the LP linearization approximates non-linear CRM effects.`
    );
  } else {
    insights.push(`Both strategies achieve similar total RWA for this portfolio.`);
  }

  // Explain key mechanism
  const hasGuarantee = mitigants.some(m => m.type === 'guarantee');
  const hasCollateral = mitigants.some(m => m.type === 'financial_collateral');
  if (hasGuarantee && hasCollateral) {
    insights.push(
      `Key insight: Guarantees use substitution (replacing borrower RW with guarantor RW), while collateral reduces exposure (E*). The optimizer weighs these different mechanisms against each exposure's risk weight to find the best global assignment.`
    );
  }

  return insights;
}

export function OptimizerInsightPanel({
  heuristic, optimized, dualValues, exposures, mitigants,
  heuristicMatrix, optimizedMatrix,
}: Props) {
  const mitMap = new Map(mitigants.map(m => [m.id, m]));
  const insights = heuristic && optimized
    ? generateInsight(exposures, mitigants, heuristicMatrix, optimizedMatrix, heuristic, optimized)
    : [];

  return (
    <div className="insight-panel">
      {insights.length > 0 && (
        <div className="insight-text">
          <h4>Why does the optimizer choose differently?</h4>
          <ul>
            {insights.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </div>
      )}

      {dualValues && Object.keys(dualValues.mitigantMarginals).length > 0 && (
        <div className="shadow-prices">
          <h4>Shadow Prices (Marginal Value of Mitigant Capacity)</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mitigant</th>
                <th className="num">Marginal Value</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dualValues.mitigantMarginals)
                .sort(([, a], [, b]) => a - b)
                .map(([mitId, val]) => {
                  const m = mitMap.get(mitId);
                  return (
                    <tr key={mitId}>
                      <td>{m?.name ?? mitId} <span className="mono">({mitId})</span></td>
                      <td className="num mono">{val > 0 ? '+' : ''}{fmt(val)}</td>
                      <td className="insight-interp">
                        {val < 0
                          ? `Adding $1M to capacity would save $${fmt(Math.abs(val))}M in RWA`
                          : `Capacity is not fully utilized`}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
