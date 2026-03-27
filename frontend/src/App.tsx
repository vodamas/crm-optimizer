import { useState, useEffect, useCallback } from 'react';
import type { Exposure, Mitigant, AllocationEntry, AllocationResult, AllocationMode, HeuristicStep, DualValues, AllocationMatrix } from './model/types';
import { EXPOSURES, MITIGANTS } from './data/portfolio';
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
import { AllocationHeatmap } from './components/AllocationHeatmap';
import { HeuristicTrace } from './components/HeuristicTrace';
import { OptimizerInsightPanel } from './components/OptimizerInsightPanel';
import { SensitivityPanel } from './components/SensitivityPanel';
import { ConcentrationChart } from './components/ConcentrationChart';
import { CollapsibleSection } from './components/CollapsibleSection';
import { PortfolioEditorDrawer } from './components/PortfolioEditorDrawer';
import './styles/app.css';

export default function App() {
  // Portfolio state (editable)
  const [exposures, setExposures] = useState<Exposure[]>(EXPOSURES);
  const [mitigants, setMitigants] = useState<Mitigant[]>(MITIGANTS);
  const totalGrossRwa = exposures.reduce((s, e) => s + e.grossRwa, 0);

  // Mode & UI state
  const [mode, setMode] = useState<AllocationMode>('heuristic');
  const [editorOpen, setEditorOpen] = useState(false);

  // Manual allocation state
  const [manualAllocs, setManualAllocs] = useState<AllocationEntry[]>([]);
  const [manualResult, setManualResult] = useState<AllocationResult | null>(null);

  // Computed results
  const [heuristicResult, setHeuristicResult] = useState<AllocationResult | null>(null);
  const [heuristicTrace, setHeuristicTrace] = useState<HeuristicStep[]>([]);
  const [optimizedResult, setOptimizedResult] = useState<AllocationResult | null>(null);
  const [dualValues, setDualValues] = useState<DualValues | null>(null);
  const [allocationMatrix, setAllocationMatrix] = useState<Record<string, AllocationMatrix>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run heuristic client-side
  const runHeuristic = useCallback(() => {
    const { result, trace } = solveHeuristic(exposures, mitigants);
    setHeuristicResult(result);
    setHeuristicTrace(trace);
  }, [exposures, mitigants]);

  // Fetch optimized from backend
  const runOptimization = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchOptimization(exposures, mitigants)
      .then(({ optimized, heuristicTrace: trace, dualValues: duals, allocationMatrix: matrix }) => {
        setOptimizedResult(optimized);
        setDualValues(duals);
        setAllocationMatrix(matrix);
        if (trace.length > 0) setHeuristicTrace(trace);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [exposures, mitigants]);

  // Run on mount and when portfolio changes
  useEffect(() => {
    runHeuristic();
    runOptimization();
  }, [runHeuristic, runOptimization]);

  // Recompute manual result
  useEffect(() => {
    setManualResult(computeAllocationResult(exposures, mitigants, manualAllocs));
  }, [exposures, mitigants, manualAllocs]);

  // Portfolio editor apply
  function handleEditorApply(newExp: Exposure[], newMit: Mitigant[]) {
    setExposures(newExp);
    setMitigants(newMit);
    setManualAllocs([]);
    setEditorOpen(false);
  }

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
      <AppBar onEditPortfolio={() => setEditorOpen(true)} />
      <main className="main-content">
        <KpiStrip
          grossRwa={totalGrossRwa}
          bestNetRwa={best?.r.totalNetRwa ?? totalGrossRwa}
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

        {/* Allocation Heatmap */}
        <CollapsibleSection title="Allocation Patterns" defaultOpen={true}>
          <AllocationHeatmap
            exposures={exposures}
            mitigants={mitigants}
            manual={manualResult}
            heuristic={heuristicResult}
            optimized={optimizedResult}
            allocationMatrix={allocationMatrix}
          />
        </CollapsibleSection>

        {/* Decision Trace / Optimizer Insights */}
        {mode === 'heuristic' && (
          <CollapsibleSection title="Heuristic Decision Trace" defaultOpen={true}>
            <HeuristicTrace trace={heuristicTrace} exposures={exposures} mitigants={mitigants} />
          </CollapsibleSection>
        )}
        {mode === 'optimized' && (
          <CollapsibleSection title="Optimizer Insights" defaultOpen={true}>
            <OptimizerInsightPanel
              heuristic={heuristicResult}
              optimized={optimizedResult}
              dualValues={dualValues}
              exposures={exposures}
              mitigants={mitigants}
              heuristicMatrix={allocationMatrix['heuristic'] ?? {}}
              optimizedMatrix={allocationMatrix['optimized'] ?? {}}
            />
          </CollapsibleSection>
        )}

        <div className="two-col">
          <div className="col-left">
            <PortfolioTable exposures={exposures} result={activeResult} />
            {mode === 'manual' && (
              <ManualAllocator
                exposures={exposures}
                mitigants={mitigants}
                allocations={manualAllocs}
                onChange={setManualAllocs}
              />
            )}
          </div>
          <div className="col-right">
            <MitigantPanel mitigants={mitigants} />
          </div>
        </div>

        <CollapsibleSection title="Strategy Comparison" defaultOpen={true}>
          <ComparisonTable
            exposures={exposures}
            manual={manualResult}
            heuristic={heuristicResult}
            optimized={optimizedResult}
          />
        </CollapsibleSection>

        <div className="charts-row">
          <SummaryBarChart
            grossRwa={totalGrossRwa}
            manual={manualResult}
            heuristic={heuristicResult}
            optimized={optimizedResult}
          />
          <WaterfallChart result={activeResult} mode={mode} />
        </div>

        <CollapsibleSection title="Advanced Analysis" defaultOpen={false}>
          <div className="analysis-row">
            <div className="card chart-card">
              <h3 className="card-title">Haircut Sensitivity</h3>
              <SensitivityPanel
                exposures={exposures}
                mitigants={mitigants}
                baseNetRwa={optimizedResult?.totalNetRwa ?? totalGrossRwa}
              />
            </div>
            <div className="card chart-card">
              <h3 className="card-title">Mitigation Concentration</h3>
              <ConcentrationChart result={activeResult} />
            </div>
          </div>
        </CollapsibleSection>
      </main>

      {editorOpen && (
        <PortfolioEditorDrawer
          exposures={exposures}
          mitigants={mitigants}
          onApply={handleEditorApply}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
