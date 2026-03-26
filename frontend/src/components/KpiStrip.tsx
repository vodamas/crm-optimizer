import type { AllocationMode } from '../model/types';

interface Props {
  grossRwa: number;
  bestNetRwa: number;
  bestSavingsPct: number;
  bestMode: AllocationMode;
}

const MODE_LABELS: Record<AllocationMode, string> = {
  manual: 'Manual',
  heuristic: 'Heuristic',
  optimized: 'Optimized (LP)',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function KpiStrip({ grossRwa, bestNetRwa, bestSavingsPct, bestMode }: Props) {
  return (
    <div className="kpi-strip">
      <div className="kpi-card">
        <div className="kpi-label">Gross Portfolio RWA</div>
        <div className="kpi-value">${fmt(grossRwa)}M</div>
      </div>
      <div className="kpi-card kpi-highlight">
        <div className="kpi-label">Best Net RWA</div>
        <div className="kpi-value">${fmt(bestNetRwa)}M</div>
      </div>
      <div className="kpi-card kpi-highlight">
        <div className="kpi-label">Best Savings</div>
        <div className="kpi-value">{bestSavingsPct.toFixed(1)}%</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Best Strategy</div>
        <div className="kpi-value kpi-mode">{MODE_LABELS[bestMode]}</div>
      </div>
    </div>
  );
}
