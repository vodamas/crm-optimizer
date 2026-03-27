import type { HeuristicStep, Exposure, Mitigant } from '../model/types';

interface Props {
  trace: HeuristicStep[];
  exposures: Exposure[];
  mitigants: Mitigant[];
}

const TYPE_COLORS: Record<string, string> = {
  financial_collateral: '#4a6fa5',
  guarantee: '#e8833a',
  netting: '#6bbd6b',
  real_estate: '#c45b5b',
};

function fmt(n: number): string {
  return n.toFixed(1);
}

export function HeuristicTrace({ trace, exposures, mitigants }: Props) {
  const expMap = new Map(exposures.map(e => [e.id, e]));
  const mitMap = new Map(mitigants.map(m => [m.id, m]));

  if (trace.length === 0) {
    return <p className="alloc-empty">No heuristic steps to display.</p>;
  }

  return (
    <div className="trace-timeline">
      {trace.map(step => {
        const exp = expMap.get(step.exposureId);
        const mit = mitMap.get(step.mitigantId);
        const color = mit ? TYPE_COLORS[mit.type] ?? '#888' : '#888';
        const gross = exp ? exp.ead * exp.riskWeight : 0;

        return (
          <div key={step.stepNumber} className="trace-step" style={{ borderLeftColor: color }}>
            <div className="trace-step-badge" style={{ backgroundColor: color }}>
              {step.stepNumber}
            </div>
            <div className="trace-step-content">
              <div className="trace-step-title">
                Assign <strong>{mit?.name ?? step.mitigantId}</strong> → <strong>{exp?.name ?? step.exposureId}</strong>
                <span className="trace-frac">({(step.fraction * 100).toFixed(0)}%)</span>
              </div>
              <div className="trace-step-reason">{step.reason}</div>
              <div className="trace-step-impact">
                RWA: {fmt(gross)} → {fmt(gross - step.rwaSaving)}
                <span className="positive"> (−{fmt(step.rwaSaving)})</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
