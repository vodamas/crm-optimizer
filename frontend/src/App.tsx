import { useState, useEffect, useCallback } from 'react';
import type { AllocationEntry, AllocationResult, AllocationMode } from './model/types';
import { EXPOSURES, MITIGANTS, TOTAL_GROSS_RWA } from './data/portfolio';
import { computeAllocationResult } from './model/crm';
import { solveHeuristic } from './model/heuristic';
import { fetchOptimization } from './api/optimize';
import { AppBar } from './components/AppBar';
import { KpiStrip } from './components/KpiStrip';
import { PortfolioTable } from './components/PortfolioTable';
import { MitigantPanel } from './components/MitigantPanel';
import { ManualAllocator } from './components/ManualAllocator';
import { ComparisonTable } from './components/ComparisonTable';
import { SummaryBarChart } from './components/SummaryBarChart';
import { WaterfallChart } from './components/WaterfallChart';
import './styles/app.css';

export default function App() {
  const [mode, setMode] = useState<AllocationMode>('heuristic');
  const [manualAllocs, setManualAllocs] = useState<AllocationEntry[]>([]);
  const [manualResult, setManualResult] = useState<AllocationResult | null>(null);
  const [heuristicResult, setHeuristicResult] = useState<AllocationResult | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<AllocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run heuristic on mount (client-side)
  useEffect(() => {
    setHeuristicResult(solveHeuristic(EXPOSURES, MITIGANTS));
  }, []);

  // Fetch optimized from backend
  useEffect(() => {
    setLoading(true);
    fetchOptimization(EXPOSURES, MITIGANTS)
      .then(({ heuristic, optimized }) => {
        setOptimizedResult(optimized);
        // Use server heuristic if available (same algo, but validates parity)
        if (!heuristicResult) setHeuristicResult(heuristic);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute manual result when allocations change
  const computeManual = useCallback(() => {
    const result = computeAllocationResult(EXPOSURES, MITIGANTS, manualAllocs);
    setManualResult(result);
  }, [manualAllocs]);

  useEffect(() => {
    computeManual();
  }, [computeManual]);

  const activeResult = mode === 'manual' ? manualResult
    : mode === 'heuristic' ? heuristicResult
    : optimizedResult;

  // Find best mode
  const results = [
    { mode: 'manual' as AllocationMode, r: manualResult },
    { mode: 'heuristic' as AllocationMode, r: heuristicResult },
    { mode: 'optimized' as AllocationMode, r: optimizedResult },
  ].filter(x => x.r !== null);
  const best = results.reduce<{ mode: AllocationMode; r: AllocationResult } | null>(
    (best, cur) => (!best || cur.r!.totalNetRwa < best.r.totalNetRwa) ? { mode: cur.mode, r: cur.r! } : best,
    null,
  );

  return (
    <div className="app-root">
      <AppBar />
      <main className="main-content">
        <KpiStrip
          grossRwa={TOTAL_GROSS_RWA}
          bestNetRwa={best?.r.totalNetRwa ?? TOTAL_GROSS_RWA}
          bestSavingsPct={best?.r.rwaSavingsPct ?? 0}
          bestMode={best?.mode ?? 'manual'}
        />

        <div className="mode-tabs">
          {(['manual', 'heuristic', 'optimized'] as AllocationMode[]).map(m => (
            <button
              key={m}
              className={`mode-tab ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'manual' ? 'Manual' : m === 'heuristic' ? 'Heuristic (Waterfall)' : 'Optimized (LP)'}
              {m === 'optimized' && loading && ' ...'}
            </button>
          ))}
        </div>

        {error && <div className="error-banner">Backend error: {error}. Showing client-side results only.</div>}

        <div className="two-col">
          <div className="col-left">
            <PortfolioTable exposures={EXPOSURES} result={activeResult} />
            {mode === 'manual' && (
              <ManualAllocator
                exposures={EXPOSURES}
                mitigants={MITIGANTS}
                allocations={manualAllocs}
                onChange={setManualAllocs}
              />
            )}
          </div>
          <div className="col-right">
            <MitigantPanel mitigants={MITIGANTS} />
          </div>
        </div>

        <h2 className="section-title">Strategy Comparison</h2>
        <ComparisonTable
          exposures={EXPOSURES}
          manual={manualResult}
          heuristic={heuristicResult}
          optimized={optimizedResult}
        />

        <div className="charts-row">
          <SummaryBarChart
            grossRwa={TOTAL_GROSS_RWA}
            manual={manualResult}
            heuristic={heuristicResult}
            optimized={optimizedResult}
          />
          <WaterfallChart result={activeResult} mode={mode} />
        </div>
      </main>
    </div>
  );
}
