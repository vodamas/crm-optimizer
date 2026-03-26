import { useState } from 'react';
import type { Exposure, Mitigant, AllocationEntry } from '../model/types';

interface Props {
  exposures: Exposure[];
  mitigants: Mitigant[];
  allocations: AllocationEntry[];
  onChange: (allocs: AllocationEntry[]) => void;
}

export function ManualAllocator({ exposures, mitigants, allocations, onChange }: Props) {
  const [selectedExp, setSelectedExp] = useState(exposures[0]?.id ?? '');
  const [selectedMit, setSelectedMit] = useState('');
  const [fraction, setFraction] = useState(1.0);

  const eligibleMitigants = mitigants.filter(m => m.eligibleExposureIds.includes(selectedExp));

  function addAllocation() {
    if (!selectedExp || !selectedMit) return;
    const existing = allocations.find(a => a.exposureId === selectedExp && a.mitigantId === selectedMit);
    if (existing) {
      onChange(allocations.map(a =>
        a.exposureId === selectedExp && a.mitigantId === selectedMit
          ? { ...a, fraction }
          : a
      ));
    } else {
      onChange([...allocations, { exposureId: selectedExp, mitigantId: selectedMit, fraction }]);
    }
  }

  function removeAllocation(expId: string, mitId: string) {
    onChange(allocations.filter(a => !(a.exposureId === expId && a.mitigantId === mitId)));
  }

  return (
    <div className="card manual-allocator">
      <h3 className="card-title">Manual Allocation</h3>
      <div className="alloc-controls">
        <select value={selectedExp} onChange={e => { setSelectedExp(e.target.value); setSelectedMit(''); }}>
          {exposures.map(exp => (
            <option key={exp.id} value={exp.id}>{exp.id} — {exp.name}</option>
          ))}
        </select>
        <select value={selectedMit} onChange={e => setSelectedMit(e.target.value)}>
          <option value="">Select mitigant...</option>
          {eligibleMitigants.map(m => (
            <option key={m.id} value={m.id}>{m.id} — {m.name}</option>
          ))}
        </select>
        <div className="fraction-control">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={fraction}
            onChange={e => setFraction(parseFloat(e.target.value))}
          />
          <span className="fraction-label">{(fraction * 100).toFixed(0)}%</span>
        </div>
        <button className="btn-add" onClick={addAllocation} disabled={!selectedMit}>
          + Assign
        </button>
      </div>
      {allocations.length > 0 && (
        <table className="data-table alloc-table">
          <thead>
            <tr>
              <th>Exposure</th>
              <th>Mitigant</th>
              <th className="num">Fraction</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a, i) => (
              <tr key={i}>
                <td className="mono">{a.exposureId}</td>
                <td className="mono">{a.mitigantId}</td>
                <td className="num">{(a.fraction * 100).toFixed(0)}%</td>
                <td>
                  <button className="btn-remove" onClick={() => removeAllocation(a.exposureId, a.mitigantId)}>
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {allocations.length === 0 && (
        <p className="alloc-empty">No allocations yet. Select an exposure and mitigant above to begin.</p>
      )}
    </div>
  );
}
