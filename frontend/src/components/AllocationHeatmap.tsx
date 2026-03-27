import { useState } from 'react';
import type { Exposure, Mitigant, AllocationResult, AllocationMatrix } from '../model/types';
import { FormulaBreakdown } from './FormulaBreakdown';

interface Props {
  exposures: Exposure[];
  mitigants: Mitigant[];
  manual: AllocationResult | null;
  heuristic: AllocationResult | null;
  optimized: AllocationResult | null;
  allocationMatrix: Record<string, AllocationMatrix>;
}

function buildMatrix(result: AllocationResult | null): AllocationMatrix {
  const m: AllocationMatrix = {};
  if (!result) return m;
  for (const a of result.allocations) {
    if (!m[a.exposureId]) m[a.exposureId] = {};
    m[a.exposureId][a.mitigantId] = a.fraction;
  }
  return m;
}

function heatColor(frac: number): string {
  if (frac <= 0) return 'transparent';
  const alpha = 0.15 + frac * 0.65;
  return `rgba(74, 111, 165, ${alpha})`;
}

const MODE_LABELS = ['Manual', 'Heuristic', 'Optimized'];

export function AllocationHeatmap({ exposures, mitigants, manual, heuristic, optimized, allocationMatrix }: Props) {
  const [selectedCell, setSelectedCell] = useState<{ expId: string; mitId: string; frac: number } | null>(null);

  const sortedExp = [...exposures].sort((a, b) => b.riskWeight - a.riskWeight || b.ead - a.ead);
  const nonNettingMit = mitigants.filter(m => m.type !== 'netting');

  const matrices = [
    buildMatrix(manual),
    allocationMatrix['heuristic'] ?? buildMatrix(heuristic),
    allocationMatrix['optimized'] ?? buildMatrix(optimized),
  ];

  return (
    <div className="heatmap-section">
      <div className="heatmap-grid-container">
        {matrices.map((matrix, modeIdx) => (
          <div key={modeIdx} className="heatmap-block">
            <div className="heatmap-mode-label">{MODE_LABELS[modeIdx]}</div>
            <div className="heatmap-scroll">
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th className="heatmap-corner"></th>
                    {nonNettingMit.map(m => (
                      <th key={m.id} className="heatmap-mit-header" title={m.name}>
                        {m.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedExp.map(e => (
                    <tr key={e.id}>
                      <td className="heatmap-exp-label" title={`${e.name} (RW=${(e.riskWeight * 100).toFixed(0)}%)`}>
                        {e.id}
                      </td>
                      {nonNettingMit.map(m => {
                        const frac = matrix[e.id]?.[m.id] ?? 0;
                        const eligible = m.eligibleExposureIds.includes(e.id);
                        return (
                          <td
                            key={m.id}
                            className={`heatmap-cell ${frac > 0 ? 'has-value' : ''} ${!eligible ? 'ineligible' : ''}`}
                            style={{ backgroundColor: heatColor(frac) }}
                            onClick={() => frac > 0 && setSelectedCell({ expId: e.id, mitId: m.id, frac })}
                            title={eligible ? (frac > 0 ? `${(frac * 100).toFixed(0)}%` : '—') : 'Not eligible'}
                          >
                            {frac > 0 ? `${(frac * 100).toFixed(0)}%` : eligible ? '' : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {selectedCell && (
        <FormulaBreakdown
          exposure={exposures.find(e => e.id === selectedCell.expId)!}
          mitigant={mitigants.find(m => m.id === selectedCell.mitId)!}
          fraction={selectedCell.frac}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
