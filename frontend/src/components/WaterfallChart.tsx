import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AllocationResult, AllocationMode } from '../model/types';

interface Props {
  result: AllocationResult | null;
  mode: AllocationMode;
}

const TYPE_LABELS: Record<string, string> = {
  financial_collateral: 'Collateral',
  guarantee: 'Guarantee',
  netting: 'Netting',
  real_estate: 'Real Estate',
};

const TYPE_COLORS: Record<string, string> = {
  financial_collateral: '#4a6fa5',
  guarantee: '#e8833a',
  netting: '#6bbd6b',
  real_estate: '#c45b5b',
};

const MODE_LABELS: Record<AllocationMode, string> = {
  manual: 'Manual',
  heuristic: 'Heuristic',
  optimized: 'Optimized (LP)',
};

export function WaterfallChart({ result, mode }: Props) {
  if (!result) return null;

  const types = Object.keys(result.byMitigantType).filter(t => result.byMitigantType[t] > 0);
  const data = types.map(t => ({
    name: TYPE_LABELS[t] ?? t,
    value: Math.round(result.byMitigantType[t] * 10) / 10,
    type: t,
  }));

  if (data.length === 0) {
    return (
      <div className="card chart-card">
        <h3 className="card-title">RWA Reduction by Mitigant Type — {MODE_LABELS[mode]}</h3>
        <p className="alloc-empty">No reductions to show.</p>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <h3 className="card-title">RWA Reduction by Mitigant Type — {MODE_LABELS[mode]}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(1)}M`, 'Reduction']} />
          <Bar dataKey="value" name="RWA Reduction ($M)" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={TYPE_COLORS[d.type] ?? '#888'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
