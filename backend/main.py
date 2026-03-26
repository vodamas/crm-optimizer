"""FastAPI backend for CRM Allocation Optimizer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import OptimizeRequest, OptimizeResponse
from heuristic import solve_heuristic
from solver import solve_optimal

app = FastAPI(title="CRM Allocation Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


class FullResponse(OptimizeResponse):
    pass


@app.post("/api/optimize")
def optimize(req: OptimizeRequest) -> dict:
    heuristic_result = solve_heuristic(req.exposures, req.mitigants)
    optimized_result = solve_optimal(req.exposures, req.mitigants)
    return {
        "heuristic": heuristic_result.model_dump(),
        "optimized": optimized_result.model_dump(),
    }
