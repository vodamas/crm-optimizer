import type { Mitigant } from '../model/types';
import { OsfiTooltip } from './OsfiTooltip';

interface Props {
  mitigants: Mitigant[];
}

const TYPE_ICONS: Record<string, string> = {
  financial_collateral: 'C',
  guarantee: 'G',
  netting: 'N',
  real_estate: 'RE',
};

const TYPE_LABELS: Record<string, string> = {
  financial_collateral: 'Financial Collateral',
  guarantee: 'Guarantee / CDS',
  netting: 'On-Balance Netting',
  real_estate: 'Real Estate (LTV)',
};

const TYPE_REFS: Record<string, string> = {
  financial_collateral: 'comprehensive_method',
  guarantee: 'guarantees',
  netting: 'netting',
  real_estate: 'real_estate_ltv',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function MitigantPanel({ mitigants }: Props) {
  return (
    <div className="card">
      <h3 className="card-title">
        Available Mitigants
        <OsfiTooltip refKey="crm_framework" />
      </h3>
      <div className="mitigant-grid">
        {mitigants.map(m => (
          <div key={m.id} className={`mitigant-card mit-${m.type}`}>
            <div className="mit-header">
              <span className="mit-icon">{TYPE_ICONS[m.type] ?? '?'}</span>
              <div>
                <div className="mit-name">{m.name}</div>
                <div className="mit-type">
                  {TYPE_LABELS[m.type] ?? m.type}
                  <OsfiTooltip refKey={TYPE_REFS[m.type] ?? 'crm_framework'} />
                </div>
              </div>
            </div>
            <div className="mit-details">
              {m.type === 'financial_collateral' && (
                <>
                  <div className="mit-row"><span>Value:</span><span>${fmt(m.value)}M</span></div>
                  <div className="mit-row">
                    <span>Hc: <OsfiTooltip refKey="standard_haircuts" /></span>
                    <span>{((m.Hc ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  {(m.Hfx ?? 0) > 0 && <div className="mit-row"><span>Hfx:</span><span>{((m.Hfx ?? 0) * 100).toFixed(0)}%</span></div>}
                </>
              )}
              {m.type === 'guarantee' && (
                <>
                  <div className="mit-row"><span>Value:</span><span>${fmt(m.value)}M</span></div>
                  <div className="mit-row"><span>Guarantor RW:</span><span>{((m.guarantorRiskWeight ?? 0) * 100).toFixed(0)}%</span></div>
                </>
              )}
              {m.type === 'netting' && (
                <>
                  <div className="mit-row"><span>Liability:</span><span>${fmt(m.liabilityAmount ?? 0)}M</span></div>
                  <div className="mit-row">
                    <span>NGR: <OsfiTooltip refKey="ngr_formula" /></span>
                    <span>{m.nettingSetId}</span>
                  </div>
                </>
              )}
              {m.type === 'real_estate' && (
                <>
                  <div className="mit-row"><span>Property Value:</span><span>${fmt(m.propertyValue ?? 0)}M</span></div>
                  <div className="mit-row"><span>LTV:</span><span>{((m.ltv ?? 0) * 100).toFixed(0)}%</span></div>
                </>
              )}
              <div className="mit-eligible">
                Eligible: {m.eligibleExposureIds.join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
