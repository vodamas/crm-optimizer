import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AllocationResult } from '../model/types';

interface Props {
  grossRwa: number;
  manual: AllocationResult | null;
  heuristic: AllocationResult | null;
  optimized: AllocationResult | null;
}

export function SummaryBarChart({ grossRwa, manual, heuristic, optimized }: Props) {
  const data = [
    { name: 'Gross', value: grossRwa },
    { name: 'Manual', value: manual?.totalNetRwa ?? grossRwa },
    { name: 'Heuristic', value: heuristic?.totalNetRwa ?? grossRwa },
    { name: 'Optimized', value: optimized?.totalNetRwa ?? grossRwa },
  ];

  return (
    <div className="card chart-card">
      <h3 className="card-title">Total RWA by Strategy</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(1)}M`, 'RWA']} />
          <Legend />
          <Bar dataKey="value" name="Net RWA ($M)" radius={[4, 4, 0, 0]}
            fill="#4a6fa5"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
