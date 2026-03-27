import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AllocationResult } from '../model/types';

interface Props {
  result: AllocationResult | null;
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

export function ConcentrationChart({ result }: Props) {
  if (!result || result.rwaSavings <= 0) {
    return <p className="alloc-empty">No savings to analyze.</p>;
  }

  const data = Object.entries(result.byMitigantType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: TYPE_LABELS[type] ?? type,
      value: Math.round(value * 10) / 10,
      type,
      pct: Math.round(value / result.rwaSavings * 1000) / 10,
    }));

  const concentrated = data.find(d => d.pct > 50);

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, value }) => `${name} ${value}`}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={TYPE_COLORS[d.type] ?? '#888'} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(1)}M`, 'Saving']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {concentrated && (
        <div className="concentration-warning">
          Warning: <strong>{concentrated.name}</strong> accounts for {concentrated.pct}% of all RWA savings. Portfolio mitigation is concentrated.
        </div>
      )}
    </div>
  );
}
