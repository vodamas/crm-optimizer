import type { Exposure, Mitigant } from '../model/types';
import { ltvToRw } from '../model/crm';

interface Props {
  exposure: Exposure;
  mitigant: Mitigant;
  fraction: number;
  onClose: () => void;
}

function fmt(n: number, dp = 2): string {
  return n.toFixed(dp);
}

export function FormulaBreakdown({ exposure: e, mitigant: m, fraction: f, onClose }: Props) {
  const gross = e.ead * e.riskWeight;

  let formulaLines: string[] = [];
  let netRwa = gross;

  if (m.type === 'financial_collateral') {
    const Hc = m.Hc ?? 0;
    const He = m.He ?? 0;
    const Hfx = m.Hfx ?? 0;
    const cAdj = m.value * f * (1 - Hc - Hfx);
    const eStar = Math.max(0, e.ead * (1 + He) - cAdj);
    netRwa = eStar * e.riskWeight;
    formulaLines = [
      `Financial Collateral — Comprehensive Method`,
      ``,
      `C_adj = C × f × (1 − Hc − Hfx)`,
      `      = ${fmt(m.value)} × ${fmt(f)} × (1 − ${fmt(Hc)} − ${fmt(Hfx)})`,
      `      = ${fmt(cAdj)}`,
      ``,
      `E* = max(0, EAD × (1 + He) − C_adj)`,
      `   = max(0, ${fmt(e.ead)} × (1 + ${fmt(He)}) − ${fmt(cAdj)})`,
      `   = max(0, ${fmt(e.ead * (1 + He))} − ${fmt(cAdj)})`,
      `   = ${fmt(eStar)}`,
      ``,
      `RWA_net = E* × RW = ${fmt(eStar)} × ${fmt(e.riskWeight)} = ${fmt(netRwa)}`,
    ];
  } else if (m.type === 'guarantee') {
    const grw = m.guarantorRiskWeight ?? 0;
    const covered = Math.min(m.value * f, e.ead);
    const uncovered = e.ead - covered;
    netRwa = covered * grw + uncovered * e.riskWeight;
    formulaLines = [
      `Guarantee — Substitution Approach`,
      ``,
      `Covered = min(G × f, EAD)`,
      `        = min(${fmt(m.value)} × ${fmt(f)}, ${fmt(e.ead)})`,
      `        = ${fmt(covered)}`,
      ``,
      `Uncovered = EAD − Covered = ${fmt(e.ead)} − ${fmt(covered)} = ${fmt(uncovered)}`,
      ``,
      `RWA_net = Covered × RW_guarantor + Uncovered × RW_borrower`,
      `        = ${fmt(covered)} × ${fmt(grw)} + ${fmt(uncovered)} × ${fmt(e.riskWeight)}`,
      `        = ${fmt(covered * grw)} + ${fmt(uncovered * e.riskWeight)}`,
      `        = ${fmt(netRwa)}`,
    ];
  } else if (m.type === 'netting') {
    const liability = m.liabilityAmount ?? 0;
    const ngr = e.ead > 0 ? Math.max(0, e.ead - liability) / e.ead : 0;
    const eAdj = (0.4 + 0.6 * ngr) * e.ead;
    netRwa = eAdj * e.riskWeight;
    formulaLines = [
      `On-Balance Netting — NGR Method`,
      ``,
      `NGR = max(0, EAD − L) / EAD`,
      `    = max(0, ${fmt(e.ead)} − ${fmt(liability)}) / ${fmt(e.ead)}`,
      `    = ${fmt(ngr, 4)}`,
      ``,
      `E_adj = (0.4 + 0.6 × NGR) × EAD`,
      `      = (0.4 + 0.6 × ${fmt(ngr, 4)}) × ${fmt(e.ead)}`,
      `      = ${fmt(eAdj)}`,
      ``,
      `RWA_net = E_adj × RW = ${fmt(eAdj)} × ${fmt(e.riskWeight)} = ${fmt(netRwa)}`,
    ];
  } else if (m.type === 'real_estate') {
    const pv = m.propertyValue ?? 0;
    const ltv = m.ltv ?? 1;
    const rwSec = ltvToRw(ltv);
    const secured = Math.min(pv * f, e.ead);
    const unsecured = e.ead - secured;
    netRwa = secured * rwSec + unsecured * e.riskWeight;
    formulaLines = [
      `Real Estate — LTV-based Risk Weights`,
      ``,
      `LTV = ${fmt(ltv * 100, 0)}% → RW_secured = ${fmt(rwSec * 100, 0)}%`,
      ``,
      `Secured = min(PV × f, EAD)`,
      `        = min(${fmt(pv)} × ${fmt(f)}, ${fmt(e.ead)})`,
      `        = ${fmt(secured)}`,
      ``,
      `Unsecured = EAD − Secured = ${fmt(e.ead)} − ${fmt(secured)} = ${fmt(unsecured)}`,
      ``,
      `RWA_net = Secured × RW_sec + Unsecured × RW_unsec`,
      `        = ${fmt(secured)} × ${fmt(rwSec)} + ${fmt(unsecured)} × ${fmt(e.riskWeight)}`,
      `        = ${fmt(secured * rwSec)} + ${fmt(unsecured * e.riskWeight)}`,
      `        = ${fmt(netRwa)}`,
    ];
  }

  const saving = gross - netRwa;

  return (
    <div className="formula-modal-overlay" onClick={onClose}>
      <div className="formula-modal" onClick={ev => ev.stopPropagation()}>
        <div className="formula-header">
          <h3>Formula Breakdown: {m.name} → {e.name}</h3>
          <button className="drawer-close" onClick={onClose}>&times;</button>
        </div>
        <div className="formula-summary">
          <span>Gross RWA: <strong>${fmt(gross)}M</strong></span>
          <span>Net RWA: <strong>${fmt(netRwa)}M</strong></span>
          <span className="positive">Saving: <strong>${fmt(saving)}M</strong></span>
        </div>
        <pre className="formula-code">{formulaLines.join('\n')}</pre>
      </div>
    </div>
  );
}
