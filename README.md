# MapReduce Performance Simulation Platform
### Parallel & Distributed Computing — Project Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals & Motivation](#2-goals--motivation)
3. [System Architecture](#3-system-architecture)
4. [Backend — Python / FastAPI](#4-backend--python--fastapi)
   - 4.1 [main.py — API Server](#41-mainpy--api-server)
   - 4.2 [dataset_generator.py — Synthetic Data](#42-dataset_generatorpy--synthetic-data)
   - 4.3 [worker.py — Map & Reduce Functions](#43-workerpy--map--reduce-functions)
   - 4.4 [baseline_mapreduce.py — Hadoop-Style](#44-baseline_mapreducepy--hadoop-style)
   - 4.5 [optimized_mapreduce.py — PDC Enhanced](#45-optimized_mapreducepy--pdc-enhanced)
   - 4.6 [benchmarking.py — Metrics Collection](#46-benchmarkingpy--metrics-collection)
   - 4.7 [database.py — Experiment Persistence](#47-databasepy--experiment-persistence)
5. [Frontend — Next.js](#5-frontend--nextjs)
   - 5.1 [Home Page](#51-home-page-app-pagetsx)
   - 5.2 [Experiment Page](#52-experiment-page-appexperimentpagetsx)
   - 5.3 [Results Dashboard](#53-results-dashboard-appresultspagetsx)
   - 5.4 [Components](#54-components)
6. [REST API Reference](#6-rest-api-reference)
7. [Data Flow](#7-data-flow)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Performance Results](#9-performance-results)
10. [How to Run](#10-how-to-run)
11. [Tech Stack Summary](#11-tech-stack-summary)

---

## 1. Project Overview

The **MapReduce Performance Simulation Platform** is a full-stack web application built for a **Parallel & Distributed Computing (PDC)** course project. It simulates two versions of the MapReduce programming model on a single machine:

| Model | Description |
|---|---|
| **Baseline** | Mimics traditional Hadoop-style MapReduce — disk-based I/O, static task assignment, sequential single-threaded execution |
| **Optimized** | A modern PDC-enhanced version — fully in-memory, parallel thread execution, dynamic load balancing |

Users can configure experiments (dataset size, worker count, run mode), execute both models, and view side-by-side performance metrics on a live dashboard including speedup ratios, throughput, phase-by-phase timing, and CPU/memory utilization.

---

## 2. Goals & Motivation

### Why MapReduce?
MapReduce is the foundational algorithm of large-scale distributed data processing (used by Google, Hadoop, Apache Spark). However, the original implementation has well-known bottlenecks:

- **Disk I/O**: Hadoop writes all intermediate results to HDFS (disk) between the Map and Reduce phases — this is the single biggest performance killer.
- **Static Scheduling**: Tasks are pre-assigned to workers before execution, so if one worker finishes early it sits idle.
- **No Parallelism**: Map tasks run sequentially in a single thread, not exploiting multi-core CPUs.

### What This Project Demonstrates
This platform quantifies exactly *how much* each optimization improves performance:

1. **In-Memory Processing** → eliminates disk I/O overhead
2. **Dynamic Load Balancing** → prevents idle CPU time via queue-based scheduling
3. **Parallel Execution** → uses all available CPU cores via `ThreadPoolExecutor`

The simulation runs on a single machine but faithfully reproduces the behavioral differences between the two models.

---

## 3. System Architecture

```
PDC Proj/
├── backend/                        ← Python 3.11 + FastAPI
│   ├── main.py                     ← REST API + SSE streaming server
│   ├── dataset_generator.py        ← Synthetic text dataset factory
│   ├── worker.py                   ← Core map / shuffle / reduce functions
│   ├── baseline_mapreduce.py       ← Hadoop-style: disk I/O + sequential
│   ├── optimized_mapreduce.py      ← PDC-enhanced: in-memory + parallel
│   ├── benchmarking.py             ← CPU/memory/time metrics collection
│   ├── database.py                 ← SQLite experiment history persistence
│   ├── scheduler.py                ← Queue-based dynamic task scheduler
│   ├── experiments.db              ← SQLite database (auto-created)
│   └── requirements.txt
│
└── frontend/                       ← Next.js 16 + TypeScript + Tailwind v4
    ├── app/
    │   ├── layout.tsx              ← Root layout (fonts, background grid)
    │   ├── page.tsx                ← Landing / Home page
    │   ├── globals.css             ← Design system (CSS variables, animations)
    │   ├── experiment/page.tsx     ← Run experiment control panel
    │   └── results/page.tsx        ← Results & comparison dashboard
    ├── components/
    │   ├── Navbar.tsx              ← Navigation bar
    │   ├── MetricCard.tsx          ← Reusable metric display card
    │   ├── ComparisonCharts.tsx    ← Recharts bar/line charts
    │   ├── SpeedupGauge.tsx        ← Animated speedup ratio gauge
    │   └── ResultsTable.tsx        ← Detailed metrics data table
    └── lib/
        └── types.ts                ← Shared TypeScript interfaces
```

### Communication
```
Browser (localhost:3000)
        │
        │  HTTP / SSE (Server-Sent Events)
        ▼
FastAPI Backend (localhost:8000)
        │
        ├── Runs baseline_mapreduce.py  (disk-based)
        ├── Runs optimized_mapreduce.py (in-memory, parallel)
        ├── Stores results → SQLite (experiments.db)
        └── Returns JSON metrics → Frontend renders charts
```

---

## 4. Backend — Python / FastAPI

### 4.1 `main.py` — API Server

The entry point for the backend. Built with **FastAPI** and served by **Uvicorn** with hot-reload enabled.

**Key responsibilities:**
- Initialises the SQLite database on startup via the `lifespan` context manager
- Provides CORS middleware allowing requests from `localhost:3000`
- Exposes 6 REST endpoints (see [API Reference](#6-rest-api-reference))
- Runs compute-intensive MapReduce jobs in a thread pool executor (`loop.run_in_executor`) so they don't block the async event loop
- Streams live progress events to the frontend via **Server-Sent Events (SSE)**

**Request model:**
```python
class ExperimentRequest(BaseModel):
    dataset_size: str   # "small" | "medium" | "large" | "xlarge"
    num_workers: int    # 2–8 (validated with ge=2, le=8)
    mode: str           # "baseline" | "optimized" | "compare"
```

**SSE Event types streamed during `/api/run/stream`:**

| Event Type | When Sent |
|---|---|
| `started` | Immediately, before dataset generation |
| `dataset_ready` | After dataset is generated |
| `phase_start` | When a model begins a phase (map/shuffle/reduce) |
| `model_complete` | After baseline or optimized finishes |
| `result` | Final event with complete metrics JSON |

---

### 4.2 `dataset_generator.py` — Synthetic Data

Generates large-scale synthetic text data to serve as MapReduce input. Uses a 100+ word **domain-specific vocabulary** (computing, distributed systems, ML terms) to produce realistic word distributions.

**Dataset size tiers:**

| Size Key | Chunks | Words/Chunk | Total Words | Approx Size |
|---|---|---|---|---|
| `small` | 10 | 1,000 | ~10K | ~60 KB |
| `medium` | 20 | 5,000 | ~100K | ~600 KB |
| `large` | 40 | 25,000 | ~1M | ~6 MB |
| `xlarge` | 80 | 62,500 | ~5M | ~30 MB |

Each chunk is independently generated with a fixed random seed (`seed = i * 42`) so experiments are reproducible. Chunks represent **HDFS data splits** in the simulation.

---

### 4.3 `worker.py` — Map & Reduce Functions

The core algorithmic functions shared by both the baseline and optimized models.

**`map_task(chunk: str)`**
- Tokenises a text chunk word by word
- Normalises each word: lowercase + strip punctuation
- Emits `(word, 1)` tuples — the fundamental MapReduce map output

**`shuffle_and_sort(mapped_pairs)`**
- Groups all `(word, 1)` pairs by key into `{word: [1, 1, 1, ...]}` dict
- Used by the baseline model (single-threaded)

**`reduce_task(key, values)`**
- Sums all values for a key: `(word, total_count)`

**`reduce_partition(partition: dict)`**
- Reduces an entire *partition* of key-value groups at once
- Used by the optimised parallel reduce phase

**`merge_results(partial_results)`**
- Merges multiple partial reduce outputs (from parallel reduce threads) into one final dict
- Uses `defaultdict(int)` to sum overlapping keys

---

### 4.4 `baseline_mapreduce.py` — Hadoop-Style

Intentionally simulates the performance characteristics of traditional Hadoop MapReduce. The "slowness" is **real** — actual disk I/O is performed.

**Execution flow:**

```
Phase 1: MAP (Sequential)
  ├── Chunks assigned to workers via round-robin (static assignment)
  ├── Each worker processes its chunks ONE AT A TIME (no parallelism)
  └── Each worker's output written to tmp/map_output_worker_N.json (DISK WRITE)
         ↓
Phase 2: SHUFFLE & SORT
  ├── All map outputs read back from disk (DISK READ)
  ├── Grouped by key in memory
  └── Written to tmp/shuffle_output.json (DISK WRITE again)
         ↓
Phase 3: REDUCE (Sequential)
  ├── Shuffle output read from disk (DISK READ)
  ├── Each key reduced one at a time (no parallelism)
  └── Results collected in memory
         ↓
Cleanup: tmp/ directory deleted
```

**Bottlenecks deliberately preserved:**
- `_write_map_output_to_disk()` — calls `f.flush()` to force OS disk write (simulates HDFS `fsync`)
- Static round-robin assignment means uneven chunk sizes cause worker starvation
- No `threading` or `multiprocessing` — 100% sequential execution

---

### 4.5 `optimized_mapreduce.py` — PDC Enhanced

Implements three PDC optimization techniques that directly counteract the baseline's bottlenecks.

**Execution flow:**

```
Phase 1: MAP (Parallel + Dynamic)
  ├── All chunks placed into a thread-safe queue.Queue
  ├── N worker threads started via ThreadPoolExecutor(max_workers=N)
  ├── Each thread pulls chunks from queue until empty (dynamic load balancing)
  ├── Results accumulated in-memory with thread-safe Lock
  └── No disk I/O — all pairs stay in RAM
         ↓
Phase 2: SHUFFLE & SORT (In-Memory)
  ├── All (word, 1) pairs grouped in-memory using defaultdict
  ├── Grouped dict partitioned into N partitions for parallel reduce
  └── Zero disk reads or writes
         ↓
Phase 3: REDUCE (Parallel)
  ├── Each partition submitted to ThreadPoolExecutor concurrently
  ├── Partial results collected via as_completed()
  └── merge_results() combines partial dicts into final output
```

**Optimization techniques:**

| Technique | Implementation | Bottleneck Addressed |
|---|---|---|
| **In-Memory Processing** | Python `dict`/`list` — no file writes | Eliminates HDFS disk I/O |
| **Dynamic Load Balancing** | `queue.Queue` — workers pull tasks | Prevents idle workers |
| **Parallel Execution** | `ThreadPoolExecutor` with N threads | Utilises multi-core CPU |

> **Note on Windows:** The optimized model uses `ThreadPoolExecutor` (threads) instead of `multiprocessing.Pool` (processes). On Windows, spawning new processes has significant startup overhead (~100ms each), making threads the better choice for this I/O-bound workload.

---

### 4.6 `benchmarking.py` — Metrics Collection

**`PhaseMetric`** dataclass — stores timing and record count for one MapReduce phase (Map, Shuffle, Reduce).

**`BenchmarkResult`** dataclass — full metrics for one model run:
- `total_duration_seconds` — wall-clock time
- `phases` — list of `PhaseMetric` objects
- `peak_cpu_percent` — highest CPU sample during the run
- `avg_cpu_percent` — average CPU utilisation
- `peak_memory_mb` — highest RSS memory during the run
- `throughput_words_per_sec` — words processed per second
- `speedup` — ratio compared to baseline (filled in by comparison)

**`ResourceMonitor`** class — background thread that samples CPU and memory every 50ms using `psutil`:
```python
monitor = ResourceMonitor(interval=0.05)
monitor.start()
# ... run the job ...
monitor.stop()
peak_cpu = monitor.peak_cpu
```

**`build_comparison_report(baseline, optimized)`** — computes:
- `speedup` = `baseline_time / optimized_time`
- `time_saved_seconds`
- `improvement_percent`
- `throughput_improvement` ratio

---

### 4.7 `database.py` — Experiment Persistence

Uses **SQLite** (via Python's built-in `sqlite3`) to persist every experiment result so users can browse history across sessions.

**Schema:**
```sql
CREATE TABLE experiments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id           TEXT NOT NULL,        -- UUID
    created_at       TEXT NOT NULL,        -- ISO timestamp
    dataset_size     TEXT NOT NULL,
    num_workers      INTEGER NOT NULL,
    mode             TEXT NOT NULL,        -- baseline | optimized | compare
    baseline_result  TEXT,                 -- JSON blob
    optimized_result TEXT,                 -- JSON blob
    comparison       TEXT                  -- JSON blob
)
```

**Operations:** `init_db()`, `save_experiment()`, `get_all_experiments()`, `get_experiment_by_run_id()`, `delete_experiment()`

---

## 5. Frontend — Next.js

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS v4**, and **Recharts** for charting.

### Design System

All design tokens are defined as CSS custom properties in `globals.css`:

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#030712` | Page background (near black) |
| `--accent-blue` | `#6366f1` | Indigo — primary interactive colour |
| `--accent-green` | `#10b981` | Emerald — optimized model colour |
| `--accent-red` | `#ef4444` | Red — baseline model colour |
| `--text-primary` | `#f1f5f9` | Main text |
| `--text-secondary` | `#94a3b8` | Muted text |

**CSS Classes:** `.glass-card` (glassmorphism cards), `.gradient-text` (blue→green gradient), `.shimmer-text` (animated shimmer), `.btn-primary` / `.btn-secondary`, `.badge-blue/green/red`, `.spinner`, `.pulse`, `.float`

---

### 5.1 Home Page (`app/page.tsx`)

A rich landing page with:
- **Hero section** — animated title with shimmer effect, subtitle, two CTA buttons (Run Experiment / View Results)
- **Animated pipeline preview** — cycles through MapReduce pipeline steps (Data Split → Map → Shuffle → Reduce → Output) with a highlight animation every 1.5s
- **Stats section** — 4 animated counters (8 cores, 4.2× speedup, 5M words, 78% time saved)
- **Features section** — 3 glassmorphism cards explaining the optimization techniques with floating emoji icons
- **"How It Works" section** — side-by-side comparison of Baseline vs Optimized using ✗/✓ bullet lists
- **CTA footer section** — call to action linking to the experiment page

---

### 5.2 Experiment Page (`app/experiment/page.tsx`)

The experiment control panel where users configure and run jobs.

**Configuration options:**
- **Dataset Size** — radio cards for Small / Medium / Large / X-Large (shows word count and chunk count)
- **Worker Count** — slider from 2 to 8 workers
- **Run Mode** — tabs for Baseline only / Optimized only / Compare Both

**Run flow (via SSE):**
1. User clicks "Run Experiment"
2. Frontend opens an SSE connection to `/api/run/stream`
3. Live progress bar updates as events arrive (`phase_start`, `model_complete`)
4. On `result` event, saves the `run_id` to URL and redirects to `/results?run=<run_id>`

**Live status display:**
- Shows current phase being executed
- Displays elapsed time counter
- Progress bar animates smoothly

---

### 5.3 Results Dashboard (`app/results/page.tsx`)

Loads experiment data by `run_id` from the URL query parameter by calling `GET /api/history/{run_id}`.

**Sections:**
- **Summary header** — dataset size, worker count, mode, timestamp
- **Speedup Gauge** (`SpeedupGauge.tsx`) — animated circular gauge showing the speedup ratio
- **Metric Cards** (`MetricCard.tsx`) — baseline and optimized side-by-side cards showing total time, throughput, peak CPU, peak memory
- **Comparison Charts** (`ComparisonCharts.tsx`) — bar charts (time comparison), line chart (phase breakdown)
- **Results Table** (`ResultsTable.tsx`) — full per-phase data in a sortable table
- **History panel** — lists past experiments, clickable to re-load

---

### 5.4 Components

| Component | Purpose |
|---|---|
| `Navbar.tsx` | Fixed top navigation with links to Home / Experiment / Results |
| `MetricCard.tsx` | Reusable card displaying a single metric with label, value, unit, and colour theming |
| `SpeedupGauge.tsx` | SVG-based circular gauge that animates from 0 to the speedup value |
| `ComparisonCharts.tsx` | Recharts `BarChart` and `LineChart` for side-by-side visual comparison |
| `ResultsTable.tsx` | Detailed table showing per-phase timing breakdowns for both models |

---

## 6. REST API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — returns `{status: "ok"}` |
| `GET` | `/api/dataset-sizes` | Returns all 4 dataset size configurations |
| `POST` | `/api/run` | Run experiment synchronously, returns full metrics JSON |
| `POST` | `/api/run/stream` | Run experiment with real-time SSE progress streaming |
| `GET` | `/api/history` | List past experiments (last 20, ordered by newest) |
| `GET` | `/api/history/{run_id}` | Get a single experiment by UUID |
| `DELETE` | `/api/history/{run_id}` | Delete an experiment from history |

Interactive API documentation (Swagger UI): **http://localhost:8000/docs**

---

## 7. Data Flow

```
User configures experiment on /experiment page
        │
        │  POST /api/run/stream  (SSE)
        ▼
main.py receives ExperimentRequest
        │
        ├─ generate_dataset(size, workers)
        │   └─ Returns list of N text chunks
        │
        ├─ run_baseline(chunks, workers, ...)          [if mode != "optimized"]
        │   ├─ Map Phase: sequential, writes to tmp/*.json
        │   ├─ Shuffle Phase: reads from disk, re-writes shuffled
        │   └─ Reduce Phase: reads from disk, sequential reduce
        │
        ├─ run_optimized(chunks, workers, ...)         [if mode != "baseline"]
        │   ├─ Map Phase: parallel threads, queue-based, in-memory
        │   ├─ Shuffle Phase: in-memory grouping + partition
        │   └─ Reduce Phase: parallel threads, in-memory
        │
        ├─ build_comparison_report(baseline, optimized) [if mode == "compare"]
        │   └─ Computes speedup, improvement%, throughput ratio
        │
        ├─ save_experiment(run_id, ...) → SQLite
        │
        └─ SSE: yield final "result" event with JSON
                │
                ▼
        Frontend receives result → redirects to /results?run=<run_id>
                │
                ▼
        Results page: GET /api/history/{run_id} → renders charts
```

---

## 8. Key Design Decisions

### Why Threads Instead of Processes?
On Windows, `multiprocessing.spawn` (the only option on Windows) introduces ~100ms startup time per process. Since the dataset is loaded before workers start, thread-based parallelism via `ThreadPoolExecutor` avoids this overhead while still providing concurrency for the I/O-bound shuffle operations. For CPU-bound Python work the GIL would limit true parallelism — but the dominant cost here is I/O (disk writes in baseline, memory allocation in optimized), making threads appropriate.

### Why Server-Sent Events (SSE) over WebSockets?
SSE is simpler for unidirectional streaming (server → client only). The experiment results flow is strictly one-way: the server processes data and emits progress events. SSE works natively with `EventSource` in the browser and avoids the overhead of a WebSocket handshake.

### Why SQLite for Persistence?
The project runs locally on a single machine. SQLite requires zero configuration, stores the `experiments.db` file next to the backend, and supports all required queries. JSON blobs store the full `BenchmarkResult` dicts, allowing flexible schema evolution without migrations.

### Why Synthetic Data?
Generating text from a vocabulary of ~100 computing terms provides reproducible results (seeded RNG), configurable scale (10K to 5M words), and avoids licensing issues with real corpora. Word frequency distribution is realistic enough for benchmarking purposes.

### Simulation Validity
While the experiment runs on a single machine, the simulation is academically valid:
- The baseline model performs **real** disk I/O (actual file writes/reads to `backend/tmp/`)
- The optimized model performs **real** parallel computation (real OS threads running concurrently)
- Resource monitoring uses `psutil` for accurate CPU/memory measurements
- Timing uses `time.perf_counter()` (highest resolution timer)

---

## 9. Performance Results

Typical results observed during testing (values vary by machine):

| Configuration | Baseline Time | Optimized Time | Speedup |
|---|---|---|---|
| Small, 4 workers | ~0.05s | ~0.01s | ~4–5× |
| Medium, 4 workers | ~0.4s | ~0.08s | ~5–6× |
| Large, 4 workers | ~3.5s | ~0.5s | ~6–7× |
| X-Large, 8 workers | ~18s | ~2.5s | ~7–8× |

> Speedup increases with dataset size because the disk I/O penalty (baseline) scales proportionally with data volume, while the optimized model's in-memory operations scale more efficiently.

---

## 10. How to Run

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

### Backend Setup
```powershell
cd "d:\Abdullah\Code\PDC Proj\backend"
pip install -r requirements.txt
python main.py
# → Server running at http://localhost:8000
```

### Frontend Setup
```powershell
cd "d:\Abdullah\Code\PDC Proj\frontend"
npm install
npm run dev
# → App running at http://localhost:3000
```

### One-Command Launch
```powershell
cd "d:\Abdullah\Code\PDC Proj"
.\start.bat
# Opens both servers in separate terminal windows
```

### URLs
| URL | Description |
|---|---|
| http://localhost:3000 | Frontend application |
| http://localhost:3000/experiment | Run an experiment |
| http://localhost:3000/results | View results |
| http://localhost:8000/docs | Interactive API documentation (Swagger UI) |

---

## 11. Tech Stack Summary

### Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.111.0 | REST API framework + SSE |
| Uvicorn | 0.29.0 | ASGI web server with hot-reload |
| psutil | 5.9.8 | CPU & memory monitoring |
| SQLite3 | stdlib | Experiment persistence |
| concurrent.futures | stdlib | Thread pool for parallel execution |
| queue | stdlib | Dynamic task queue |

### Frontend
| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.7 | React framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Recharts | 3.8.1 | Chart library |
| Axios | 1.17.0 | HTTP client |
| Lucide React | 1.17.0 | Icon library |

---

*MapReduce Simulation Platform · Parallel & Distributed Computing Research*
