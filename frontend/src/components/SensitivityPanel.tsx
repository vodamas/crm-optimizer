import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Exposure, Mitigant, SensitivityPoint } from '../model/types';
import { fetchSensitivity } from '../api/optimize';

interface Props {
  exposures: Exposure[];
  mitigants: Mitigant[];
  baseNetRwa: number;
}

const FACTORS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];

export function SensitivityPanel({ exposures, mitigants, baseNetRwa }: Props) {
  const [points, setPoints] = useState<SensitivityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [stressFactor, setStressFactor] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetchSensitivity(exposures, mitigants, FACTORS)
      .then(setPoints)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [exposures, mitigants]);

  const currentPoint = points.find(p => Math.abs(p.stressFactor - stressFactor) < 0.05);
  const delta = currentPoint ? currentPoint.totalNetRwa - baseNetRwa : 0;
  const deltaPct = baseNetRwa > 0 ? (delta / baseNetRwa) * 100 : 0;

  return (
    <div>
      <div className="sensitivity-controls">
        <label>Haircut Stress: <strong>{stressFactor.toFixed(1)}x</strong></label>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.1}
          value={stressFactor}
          onChange={e => setStressFactor(parseFloat(e.target.value))}
        />
        {currentPoint && (
          <div className={`sensitivity-delta ${delta > 0 ? 'negative' : 'positive'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}M ({deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
          </div>
        )}
      </div>
      {loading && <p className="alloc-empty">Loading sensitivity data...</p>}
      {error && <p className="alloc-empty">Sensitivity unavailable: {error}</p>}
      {points.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="stressFactor" tick={{ fontSize: 11 }} tickFormatter={v => `${v}x`} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(1)}M`, 'Net RWA']} labelFormatter={l => `Stress: ${l}x`} />
            <ReferenceLine x={1.0} stroke="#888" strokeDasharray="3 3" label="Base" />
            <ReferenceLine x={stressFactor} stroke="#e8833a" strokeWidth={2} />
            <Line type="monotone" dataKey="totalNetRwa" stroke="#4a6fa5" strokeWidth={2} dot={{ r: 3 }} name="Net RWA" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
