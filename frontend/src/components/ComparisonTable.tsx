import type { Exposure, AllocationResult } from '../model/types';

interface Props {
  exposures: Exposure[];
  manual: AllocationResult | null;
  heuristic: AllocationResult | null;
  optimized: AllocationResult | null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function ComparisonTable({ exposures, manual, heuristic, optimized }: Props) {
  function getNet(result: AllocationResult | null, expId: string, grossRwa: number): number {
    if (!result) return grossRwa;
    const pe = result.perExposure.find(e => e.exposureId === expId);
    return pe?.netRwa ?? grossRwa;
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="data-table comparison-table">
          <thead>
            <tr>
              <th>Exposure</th>
              <th className="num">Gross RWA</th>
              <th className="num col-manual">Manual</th>
              <th className="num col-heuristic">Heuristic</th>
              <th className="num col-optimized">Optimized</th>
            </tr>
          </thead>
          <tbody>
            {exposures.map(e => (
              <tr key={e.id}>
                <td><span className="mono">{e.id}</span> {e.name}</td>
                <td className="num">{fmt(e.grossRwa)}</td>
                <td className="num col-manual">{fmt(getNet(manual, e.id, e.grossRwa))}</td>
                <td className="num col-heuristic">{fmt(getNet(heuristic, e.id, e.grossRwa))}</td>
                <td className="num col-optimized">{fmt(getNet(optimized, e.id, e.grossRwa))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td className="num"><strong>{fmt(exposures.reduce((s, e) => s + e.grossRwa, 0))}</strong></td>
              <td className="num col-manual"><strong>{fmt(manual?.totalNetRwa ?? exposures.reduce((s, e) => s + e.grossRwa, 0))}</strong></td>
              <td className="num col-heuristic"><strong>{fmt(heuristic?.totalNetRwa ?? exposures.reduce((s, e) => s + e.grossRwa, 0))}</strong></td>
              <td className="num col-optimized"><strong>{fmt(optimized?.totalNetRwa ?? exposures.reduce((s, e) => s + e.grossRwa, 0))}</strong></td>
            </tr>
            <tr className="savings-row">
              <td><strong>RWA Savings</strong></td>
              <td></td>
              <td className="num col-manual positive"><strong>{manual && manual.rwaSavings > 0 ? `${manual.rwaSavingsPct.toFixed(1)}%` : '—'}</strong></td>
              <td className="num col-heuristic positive"><strong>{heuristic ? `${heuristic.rwaSavingsPct.toFixed(1)}%` : '—'}</strong></td>
              <td className="num col-optimized positive"><strong>{optimized ? `${optimized.rwaSavingsPct.toFixed(1)}%` : '—'}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
