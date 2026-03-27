"""FastAPI backend for CRM Allocation Optimizer."""

from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import (
    OptimizeRequest, OptimizeResponse, EnrichedOptimizeResponse,
    SensitivityRequest, SensitivityPoint,
)
from heuristic import solve_heuristic
from solver import solve_optimal, solve_sensitivity_sweep

app = FastAPI(title="CRM Allocation Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_alloc_matrix(resp: OptimizeResponse) -> dict[str, dict[str, float]]:
    """Build exposure_id -> mitigant_id -> fraction map from allocations."""
    matrix: dict[str, dict[str, float]] = {}
    for a in resp.allocations:
        matrix.setdefault(a.exposure_id, {})[a.mitigant_id] = a.fraction
    return matrix


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/optimize")
def optimize(req: OptimizeRequest) -> dict:
    heuristic_result, heuristic_trace = solve_heuristic(req.exposures, req.mitigants)
    optimized_result, dual_values = solve_optimal(req.exposures, req.mitigants)

    allocation_matrix = {
        "heuristic": _build_alloc_matrix(heuristic_result),
        "optimized": _build_alloc_matrix(optimized_result),
    }

    return {
        "heuristic": heuristic_result.model_dump(),
        "optimized": optimized_result.model_dump(),
        "heuristic_trace": [s.model_dump() for s in heuristic_trace],
        "dual_values": dual_values.model_dump() if dual_values else None,
        "allocation_matrix": allocation_matrix,
    }


@app.post("/api/sensitivity")
def sensitivity(req: SensitivityRequest) -> List[dict]:
    points = solve_sensitivity_sweep(req.exposures, req.mitigants, req.stress_factors)
    return [p.model_dump() for p in points]
