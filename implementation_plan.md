# MapReduce Web Simulation Platform — Implementation Plan

A web-based system that simulates traditional Hadoop-style MapReduce (baseline) and a modernized in-memory + parallel version (optimized), allowing users to visually compare both through an interactive dashboard.

---

## Architecture Overview

```
d:\Abdullah\Code\PDC Proj\
├── backend/                  ← Python / FastAPI
│   ├── main.py               ← API entry point
│   ├── dataset_generator.py  ← Synthetic text dataset generator
│   ├── baseline_mapreduce.py ← Disk-based, static, single-threaded MapReduce
│   ├── optimized_mapreduce.py← In-memory, parallel, dynamic MapReduce
│   ├── scheduler.py          ← Queue-based dynamic task scheduler
│   ├── worker.py             ← Worker simulation for map/reduce tasks
│   ├── benchmarking.py       ← Metrics collection (time, CPU, throughput)
│   └── requirements.txt
│
└── frontend/                 ← Next.js + Tailwind + Recharts
    ├── app/
    │   ├── page.tsx           ← Landing / Home
    │   ├── experiment/page.tsx← Run experiment UI
    │   └── results/page.tsx   ← Results & comparison dashboard
    ├── components/
    │   ├── MetricCard.tsx
    │   ├── ComparisonChart.tsx
    │   ├── WorkerTimeline.tsx
    │   └── DatasetConfig.tsx
    └── ...
```

---

## Proposed Changes

### Backend (Python / FastAPI)

#### [NEW] `backend/requirements.txt`
FastAPI, uvicorn, psutil, multiprocessing (stdlib).

#### [NEW] `backend/dataset_generator.py`
- Generates synthetic word-count datasets of configurable size (small/medium/large/xlarge).
- Returns list of text chunks (simulating HDFS splits).

#### [NEW] `backend/baseline_mapreduce.py`
- **Intentionally slow** to simulate Hadoop limitations:
  - Writes intermediate key-value pairs to `tmp/` disk files after Map phase.
  - Reads from disk for Shuffle/Reduce phase.
  - Sequential (single-process) execution of tasks.
  - Fixed, static worker assignment.
- Returns timing metrics per phase.

#### [NEW] `backend/optimized_mapreduce.py`
- **In-memory processing**: Intermediate results stored in Python dicts/lists, never touching disk.
- **Parallel execution**: Uses `multiprocessing.Pool` to run map tasks concurrently across CPU cores.
- **Dynamic load balancing**: Uses `multiprocessing.Queue` — workers pull chunks as available rather than being pre-assigned.
- Returns timing metrics per phase.

#### [NEW] `backend/scheduler.py`
- Queue-based scheduler that distributes map/reduce tasks to the worker pool dynamically.
- Tracks per-worker task counts for load balance reporting.

#### [NEW] `backend/worker.py`
- Map worker: tokenizes text chunk → emits (word, 1) pairs.
- Reduce worker: groups and sums counts.

#### [NEW] `backend/benchmarking.py`
- Wraps any function call, measures wall-clock time, CPU %, peak memory.
- Returns `BenchmarkResult` dataclass.

#### [NEW] `backend/main.py`
REST API endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-dataset` | Generate synthetic dataset of given size |
| POST | `/api/run/baseline` | Run baseline MapReduce, return metrics |
| POST | `/api/run/optimized` | Run optimized MapReduce, return metrics |
| POST | `/api/run/compare` | Run both sequentially, return side-by-side metrics |
| GET  | `/api/health` | Health check |

---

### Frontend (Next.js + Tailwind + Recharts)

#### [NEW] `frontend/` — Next.js app bootstrapped via `create-next-app`

**Pages:**
- **`/`** — Hero landing page explaining the project, animated stats, CTA to start experiment.
- **`/experiment`** — Control panel: dataset size selector, worker count slider, mode picker (Baseline / Optimized / Compare Both). Run button.
- **`/results`** — Dashboard showing:
  - Execution time bar chart (Baseline vs Optimized)
  - Speedup ratio gauge
  - Throughput line chart across dataset sizes
  - Per-phase breakdown (Map / Shuffle / Reduce) stacked bar
  - Worker utilization timeline (Gantt-style)
  - Raw metrics table

**Design System:**
- Dark mode (dark navy/slate background)
- Accent: electric blue + emerald green gradient
- Typography: Inter (Google Fonts)
- Glassmorphism cards
- Animated progress bars during job execution

---

## Key Design Decisions

> [!IMPORTANT]
> **Simulation Approach**: Since this runs on a single machine (not a real cluster), the "distributed" behavior is simulated via Python's `multiprocessing` module. Each process acts as a "worker node". This is academically valid and common in distributed systems research papers.

> [!IMPORTANT]
> **Baseline Disk I/O**: The baseline model writes to `backend/tmp/` folder. This must be created at runtime and cleaned up after each run. The artificial disk I/O delay is real — writing large files to disk genuinely slows it down compared to in-memory.

> [!NOTE]
> **Dataset Sizes**: Four tiers will be supported:
> - Small: ~10K words
> - Medium: ~100K words
> - Large: ~1M words
> - X-Large: ~5M words

---

## Open Questions

> [!IMPORTANT]
> **Q1: Worker count**: Should the number of simulated worker nodes be fixed (e.g., 4) or configurable by the user (slider 2–8)?

> [!IMPORTANT]
> **Q2: Real-time streaming**: Should the experiment page show live progress (via WebSocket / SSE) as the job runs, or just show results after completion? Live progress is more impressive but adds complexity.

> [!NOTE]
> **Q3: Persistence**: Should past experiment results be saved (e.g., SQLite) so users can compare across runs, or is in-memory / session-only sufficient?

---

## Verification Plan

### Automated Tests
- `pytest backend/` — unit tests for map/reduce functions and dataset generator.

### Manual Verification
- Run both models on all 4 dataset sizes and confirm optimized is measurably faster.
- Verify charts render correctly with real data.
- Confirm CORS works between `localhost:3000` (frontend) and `localhost:8000` (backend).
- Confirm disk-cleanup after baseline runs.
