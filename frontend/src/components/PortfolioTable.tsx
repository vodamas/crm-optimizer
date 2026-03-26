import type { Exposure, AllocationResult } from '../model/types';

interface Props {
  exposures: Exposure[];
  result: AllocationResult | null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function PortfolioTable({ exposures, result }: Props) {
  const perExp = result ? new Map(result.perExposure.map(e => [e.exposureId, e])) : null;

  return (
    <div className="card">
      <h3 className="card-title">Exposure Portfolio</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Counterparty</th>
              <th>Asset Class</th>
              <th className="num">EAD ($M)</th>
              <th className="num">RW</th>
              <th className="num">Gross RWA</th>
              <th className="num">Net RWA</th>
              <th className="num">Saving</th>
            </tr>
          </thead>
          <tbody>
            {exposures.map(e => {
              const pe = perExp?.get(e.id);
              const netRwa = pe?.netRwa ?? e.grossRwa;
              const saving = e.grossRwa - netRwa;
              return (
                <tr key={e.id}>
                  <td className="mono">{e.id}</td>
                  <td>{e.name}</td>
                  <td>{e.counterparty}</td>
                  <td><span className="asset-badge">{e.assetClass.replace('_', ' ')}</span></td>
                  <td className="num">{fmt(e.ead)}</td>
                  <td className="num">{(e.riskWeight * 100).toFixed(0)}%</td>
                  <td className="num">{fmt(e.grossRwa)}</td>
                  <td className="num">{fmt(netRwa)}</td>
                  <td className={`num ${saving > 0 ? 'positive' : ''}`}>
                    {saving > 0 ? `-${fmt(saving)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}><strong>Total</strong></td>
              <td className="num"><strong>{fmt(exposures.reduce((s, e) => s + e.grossRwa, 0))}</strong></td>
              <td className="num"><strong>{fmt(result?.totalNetRwa ?? exposures.reduce((s, e) => s + e.grossRwa, 0))}</strong></td>
              <td className="num positive">
                <strong>{result && result.rwaSavings > 0 ? `-${fmt(result.rwaSavings)}` : '—'}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
