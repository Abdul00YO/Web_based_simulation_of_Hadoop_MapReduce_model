"""
FastAPI Main — MapReduce Simulation API
Provides REST endpoints + Server-Sent Events for real-time progress streaming.
"""

import uuid
import asyncio
import json
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from dataset_generator import generate_dataset, get_available_sizes
from baseline_mapreduce import run_baseline
from optimized_mapreduce import run_optimized
from benchmarking import build_comparison_report
from database import init_db, save_experiment, get_all_experiments, get_experiment_by_run_id, delete_experiment


# ─────────────────────────────────────────────
#  App Lifecycle
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="MapReduce Simulation API",
    description="Simulates baseline and optimized MapReduce for performance comparison",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
#  Request / Response Models
# ─────────────────────────────────────────────

class ExperimentRequest(BaseModel):
    dataset_size: str = Field(default="small", description="small | medium | large | xlarge")
    num_workers: int = Field(default=4, ge=2, le=8, description="Number of simulated workers (2-8)")
    mode: str = Field(default="compare", description="baseline | optimized | compare")


# ─────────────────────────────────────────────
#  Helper: run job in thread pool (non-blocking)
# ─────────────────────────────────────────────

def _run_experiment_sync(request: ExperimentRequest) -> dict:
    """Synchronous experiment runner — called in a thread executor."""
    dataset = generate_dataset(request.dataset_size, request.num_workers)
    chunks = dataset["chunks"]
    total_words = dataset["total_words"]
    run_id = str(uuid.uuid4())

    baseline_result = None
    optimized_result = None
    comparison = None

    if request.mode in ("baseline", "compare"):
        b = run_baseline(chunks, request.num_workers, request.dataset_size, total_words)
        baseline_result = b.to_dict()

    if request.mode in ("optimized", "compare"):
        o = run_optimized(chunks, request.num_workers, request.dataset_size, total_words)
        optimized_result = o.to_dict()

    if request.mode == "compare" and baseline_result and optimized_result:
        from benchmarking import BenchmarkResult, PhaseMetric

        def _reconstruct(d: dict) -> BenchmarkResult:
            phases = [
                PhaseMetric(p["phase_name"], p["duration_seconds"], p["records_processed"])
                for p in d.get("phases", [])
            ]
            return BenchmarkResult(
                model=d["model"],
                dataset_size=d["dataset_size"],
                num_workers=d["num_workers"],
                total_words=d["total_words"],
                unique_words=d["unique_words"],
                total_duration_seconds=d["total_duration_seconds"],
                phases=phases,
                peak_cpu_percent=d["peak_cpu_percent"],
                avg_cpu_percent=d["avg_cpu_percent"],
                peak_memory_mb=d["peak_memory_mb"],
                throughput_words_per_sec=d["throughput_words_per_sec"],
            )

        report = build_comparison_report(_reconstruct(baseline_result), _reconstruct(optimized_result))
        comparison = report["comparison"]
        baseline_result = report["baseline"]
        optimized_result = report["optimized"]

    save_experiment(run_id, request.dataset_size, request.num_workers, request.mode,
                    baseline_result, optimized_result, comparison)

    return {
        "run_id": run_id,
        "dataset_size": request.dataset_size,
        "num_workers": request.num_workers,
        "mode": request.mode,
        "dataset_info": {
            "num_chunks": dataset["num_chunks"],
            "total_words": dataset["total_words"],
            "size_bytes": dataset["size_bytes"],
        },
        "baseline": baseline_result,
        "optimized": optimized_result,
        "comparison": comparison,
    }


# ─────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MapReduce Simulation API"}


@app.get("/api/dataset-sizes")
def dataset_sizes():
    """Return available dataset size configurations."""
    return {"sizes": get_available_sizes()}


@app.post("/api/run")
async def run_experiment(request: ExperimentRequest):
    """
    Run an experiment (baseline, optimized, or compare both).
    Returns full metrics after completion.
    """
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _run_experiment_sync, request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run/stream")
async def run_experiment_stream(request: ExperimentRequest):
    """
    Run experiment with Server-Sent Events for real-time progress updates.
    Streams progress events, then a final 'result' event with full metrics.
    """

    async def event_generator():
        progress_events = []
        result_holder = {}

        def sync_progress_cb(phase: str, pct: int):
            progress_events.append({"phase": phase, "pct": pct})

        async def drain_events():
            while progress_events:
                ev = progress_events.pop(0)
                yield f"data: {json.dumps({'type': 'progress', **ev})}\n\n"
                await asyncio.sleep(0)

        yield f"data: {json.dumps({'type': 'started', 'message': 'Generating dataset...'})}\n\n"
        await asyncio.sleep(0)

        loop = asyncio.get_event_loop()

        # Generate dataset
        dataset = await loop.run_in_executor(
            None, generate_dataset, request.dataset_size, request.num_workers
        )
        chunks = dataset["chunks"]
        total_words = dataset["total_words"]
        run_id = str(uuid.uuid4())

        yield f"data: {json.dumps({'type': 'dataset_ready', 'total_words': total_words, 'num_chunks': dataset['num_chunks']})}\n\n"
        await asyncio.sleep(0)

        baseline_result = None
        optimized_result = None

        # Run baseline
        if request.mode in ("baseline", "compare"):
            yield f"data: {json.dumps({'type': 'phase_start', 'model': 'baseline', 'phase': 'map'})}\n\n"
            await asyncio.sleep(0)

            b = await loop.run_in_executor(
                None, run_baseline,
                chunks, request.num_workers, request.dataset_size, total_words, None
            )
            baseline_result = b.to_dict()
            yield f"data: {json.dumps({'type': 'model_complete', 'model': 'baseline', 'duration': b.total_duration_seconds})}\n\n"
            await asyncio.sleep(0)

        # Run optimized
        if request.mode in ("optimized", "compare"):
            yield f"data: {json.dumps({'type': 'phase_start', 'model': 'optimized', 'phase': 'map'})}\n\n"
            await asyncio.sleep(0)

            o = await loop.run_in_executor(
                None, run_optimized,
                chunks, request.num_workers, request.dataset_size, total_words, None
            )
            optimized_result = o.to_dict()
            yield f"data: {json.dumps({'type': 'model_complete', 'model': 'optimized', 'duration': o.total_duration_seconds})}\n\n"
            await asyncio.sleep(0)

        # Build comparison
        comparison = None
        if request.mode == "compare" and baseline_result and optimized_result:
            from benchmarking import BenchmarkResult, PhaseMetric

            def _reconstruct(d):
                phases = [
                    PhaseMetric(p["phase_name"], p["duration_seconds"], p["records_processed"])
                    for p in d.get("phases", [])
                ]
                return BenchmarkResult(
                    model=d["model"], dataset_size=d["dataset_size"],
                    num_workers=d["num_workers"], total_words=d["total_words"],
                    unique_words=d["unique_words"],
                    total_duration_seconds=d["total_duration_seconds"],
                    phases=phases,
                    peak_cpu_percent=d["peak_cpu_percent"],
                    avg_cpu_percent=d["avg_cpu_percent"],
                    peak_memory_mb=d["peak_memory_mb"],
                    throughput_words_per_sec=d["throughput_words_per_sec"],
                )

            report = build_comparison_report(_reconstruct(baseline_result), _reconstruct(optimized_result))
            comparison = report["comparison"]
            baseline_result = report["baseline"]
            optimized_result = report["optimized"]

        save_experiment(run_id, request.dataset_size, request.num_workers, request.mode,
                        baseline_result, optimized_result, comparison)

        final = {
            "type": "result",
            "run_id": run_id,
            "dataset_size": request.dataset_size,
            "num_workers": request.num_workers,
            "mode": request.mode,
            "dataset_info": {
                "num_chunks": dataset["num_chunks"],
                "total_words": total_words,
                "size_bytes": dataset["size_bytes"],
            },
            "baseline": baseline_result,
            "optimized": optimized_result,
            "comparison": comparison,
        }
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/history")
def get_history(limit: int = 20):
    """Return past experiment results from SQLite."""
    experiments = get_all_experiments(limit=limit)
    return {"experiments": experiments, "count": len(experiments)}


@app.get("/api/history/{run_id}")
def get_experiment(run_id: str):
    """Retrieve a single experiment by run_id."""
    exp = get_experiment_by_run_id(run_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@app.delete("/api/history/{run_id}")
def delete_history_entry(run_id: str):
    """Delete a single experiment from history."""
    deleted = delete_experiment(run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {"deleted": True, "run_id": run_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
