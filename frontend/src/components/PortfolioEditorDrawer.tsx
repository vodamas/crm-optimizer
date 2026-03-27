import { useState } from 'react';
import type { Exposure, Mitigant, AssetClass, MitigantType } from '../model/types';
import { PRESETS } from '../data/portfolio';

interface Props {
  exposures: Exposure[];
  mitigants: Mitigant[];
  onApply: (exposures: Exposure[], mitigants: Mitigant[]) => void;
  onClose: () => void;
}

const ASSET_CLASSES: AssetClass[] = ['sovereign', 'bank', 'corporate', 'retail_mortgage', 'retail_other'];
const MIT_TYPES: MitigantType[] = ['financial_collateral', 'guarantee', 'netting', 'real_estate'];

let nextExpId = 100;
let nextMitId = 100;

export function PortfolioEditorDrawer({ exposures: initExp, mitigants: initMit, onApply, onClose }: Props) {
  const [tab, setTab] = useState<'exposures' | 'mitigants'>('exposures');
  const [exposures, setExposures] = useState<Exposure[]>(initExp.map(e => ({ ...e })));
  const [mitigants, setMitigants] = useState<Mitigant[]>(initMit.map(m => ({ ...m })));

  function loadPreset(presetId: string) {
    const p = PRESETS.find(p => p.id === presetId);
    if (p) {
      setExposures(p.exposures.map(e => ({ ...e })));
      setMitigants(p.mitigants.map(m => ({ ...m })));
    }
  }

  function updateExp(idx: number, field: string, value: string | number) {
    setExposures(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      if (field === 'ead' || field === 'riskWeight') {
        updated.grossRwa = Math.round(updated.ead * updated.riskWeight * 100) / 100;
      }
      return updated;
    }));
  }

  function addExposure() {
    nextExpId++;
    setExposures(prev => [...prev, {
      id: `E${nextExpId}`, name: 'New Exposure', counterparty: 'Counterparty',
      assetClass: 'corporate', ead: 10, riskWeight: 1.0, grossRwa: 10,
    }]);
  }

  function removeExposure(idx: number) {
    setExposures(prev => prev.filter((_, i) => i !== idx));
  }

  function updateMit(idx: number, field: string, value: unknown) {
    setMitigants(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function addMitigant() {
    nextMitId++;
    setMitigants(prev => [...prev, {
      id: `M${nextMitId}`, name: 'New Mitigant', type: 'financial_collateral' as MitigantType,
      value: 10, Hc: 0, He: 0, Hfx: 0, eligibleExposureIds: [],
    }]);
  }

  function removeMitigant(idx: number) {
    setMitigants(prev => prev.filter((_, i) => i !== idx));
  }

  function toggleEligible(mitIdx: number, expId: string) {
    setMitigants(prev => prev.map((m, i) => {
      if (i !== mitIdx) return m;
      const ids = m.eligibleExposureIds.includes(expId)
        ? m.eligibleExposureIds.filter(id => id !== expId)
        : [...m.eligibleExposureIds, expId];
      return { ...m, eligibleExposureIds: ids };
    }));
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Portfolio Editor</h2>
          <button className="drawer-close" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-preset">
          <label>Load Preset:</label>
          <select onChange={e => e.target.value && loadPreset(e.target.value)} defaultValue="">
            <option value="">— Select —</option>
            {PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {p.description}</option>
            ))}
          </select>
        </div>

        <div className="drawer-tabs">
          <button className={tab === 'exposures' ? 'active' : ''} onClick={() => setTab('exposures')}>
            Exposures ({exposures.length})
          </button>
          <button className={tab === 'mitigants' ? 'active' : ''} onClick={() => setTab('mitigants')}>
            Mitigants ({mitigants.length})
          </button>
        </div>

        <div className="drawer-body">
          {tab === 'exposures' && (
            <>
              <div className="editor-table-wrap">
                <table className="editor-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Name</th><th>Counterparty</th><th>Class</th>
                      <th>EAD</th><th>RW</th><th>Gross RWA</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {exposures.map((e, i) => (
                      <tr key={e.id}>
                        <td className="mono">{e.id}</td>
                        <td><input value={e.name} onChange={ev => updateExp(i, 'name', ev.target.value)} /></td>
                        <td><input value={e.counterparty} onChange={ev => updateExp(i, 'counterparty', ev.target.value)} /></td>
                        <td>
                          <select value={e.assetClass} onChange={ev => updateExp(i, 'assetClass', ev.target.value)}>
                            {ASSET_CLASSES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                          </select>
                        </td>
                        <td><input type="number" value={e.ead} min={0} onChange={ev => updateExp(i, 'ead', parseFloat(ev.target.value) || 0)} /></td>
                        <td><input type="number" value={e.riskWeight} min={0} max={3} step={0.05} onChange={ev => updateExp(i, 'riskWeight', parseFloat(ev.target.value) || 0)} /></td>
                        <td className="mono">{e.grossRwa.toFixed(1)}</td>
                        <td><button className="btn-remove" onClick={() => removeExposure(i)}>&times;</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-add" onClick={addExposure}>+ Add Exposure</button>
            </>
          )}

          {tab === 'mitigants' && (
            <>
              {mitigants.map((m, i) => (
                <div key={m.id} className="editor-mit-card">
                  <div className="editor-mit-header">
                    <span className="mono">{m.id}</span>
                    <input value={m.name} onChange={ev => updateMit(i, 'name', ev.target.value)} />
                    <select value={m.type} onChange={ev => updateMit(i, 'type', ev.target.value)}>
                      {MIT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                    <button className="btn-remove" onClick={() => removeMitigant(i)}>&times;</button>
                  </div>
                  <div className="editor-mit-fields">
                    {(m.type === 'financial_collateral' || m.type === 'guarantee') && (
                      <label>Value: <input type="number" value={m.value} min={0} onChange={ev => updateMit(i, 'value', parseFloat(ev.target.value) || 0)} /></label>
                    )}
                    {m.type === 'financial_collateral' && (
                      <>
                        <label>Hc: <input type="number" value={m.Hc ?? 0} min={0} max={1} step={0.01} onChange={ev => updateMit(i, 'Hc', parseFloat(ev.target.value) || 0)} /></label>
                        <label>He: <input type="number" value={m.He ?? 0} min={0} max={1} step={0.01} onChange={ev => updateMit(i, 'He', parseFloat(ev.target.value) || 0)} /></label>
                        <label>Hfx: <input type="number" value={m.Hfx ?? 0} min={0} max={1} step={0.01} onChange={ev => updateMit(i, 'Hfx', parseFloat(ev.target.value) || 0)} /></label>
                      </>
                    )}
                    {m.type === 'guarantee' && (
                      <label>Guarantor RW: <input type="number" value={m.guarantorRiskWeight ?? 0} min={0} max={3} step={0.05} onChange={ev => updateMit(i, 'guarantorRiskWeight', parseFloat(ev.target.value) || 0)} /></label>
                    )}
                    {m.type === 'netting' && (
                      <>
                        <label>Liability: <input type="number" value={m.liabilityAmount ?? 0} min={0} onChange={ev => updateMit(i, 'liabilityAmount', parseFloat(ev.target.value) || 0)} /></label>
                        <label>Netting Set: <input value={m.nettingSetId ?? ''} onChange={ev => updateMit(i, 'nettingSetId', ev.target.value)} /></label>
                      </>
                    )}
                    {m.type === 'real_estate' && (
                      <>
                        <label>Property Value: <input type="number" value={m.propertyValue ?? 0} min={0} onChange={ev => updateMit(i, 'propertyValue', parseFloat(ev.target.value) || 0)} /></label>
                        <label>LTV: <input type="number" value={m.ltv ?? 0} min={0} max={1} step={0.05} onChange={ev => updateMit(i, 'ltv', parseFloat(ev.target.value) || 0)} /></label>
                      </>
                    )}
                  </div>
                  <div className="editor-eligible">
                    <span className="editor-eligible-label">Eligible exposures:</span>
                    <div className="editor-eligible-checks">
                      {exposures.map(e => (
                        <label key={e.id} className="editor-check">
                          <input
                            type="checkbox"
                            checked={m.eligibleExposureIds.includes(e.id)}
                            onChange={() => toggleEligible(i, e.id)}
                          />
                          {e.id}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn-add" onClick={addMitigant}>+ Add Mitigant</button>
            </>
          )}
        </div>

        <div className="drawer-footer">
          <button className="btn-apply" onClick={() => onApply(exposures, mitigants)}>
            Apply & Optimize
          </button>
        </div>
      </div>
    </div>
  );
}
