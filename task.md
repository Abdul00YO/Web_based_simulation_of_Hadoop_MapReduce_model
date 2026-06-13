# Build Task Tracker

## Backend
- `[x]` `requirements.txt`
- `[x]` `dataset_generator.py`
- `[x]` `worker.py`
- `[x]` `scheduler.py`
- `[x]` `benchmarking.py`
- `[x]` `baseline_mapreduce.py`
- `[x]` `optimized_mapreduce.py`
- `[x]` `database.py` (SQLite persistence)
- `[x]` `main.py` (FastAPI + SSE)

## Frontend
- `[x]` Bootstrap Next.js app
- `[x]` Configure Tailwind + fonts
- `[x]` Global CSS design system
- `[x]` Landing page (`/`)
- `[x]` Experiment page (`/experiment`)
- `[x]` Results / History page (`/results`)
- `[x]` Components: Navbar, MetricCard, ComparisonCharts, SpeedupGauge, ResultsTable
- `[x]` Shared TypeScript types (`lib/types.ts`)
- `[x]` Startup script (`start.bat`)

## Integration & Verification
- `[x]` CORS configured
- `[x]` pip install backend deps
- `[x]` Start both servers and do end-to-end smoke test
- `[x]` Charts render with real data
- `[x]` SQLite history saves/loads correctly

## Bug Fixes Applied
- `[x]` Fixed `f.flush()` called outside `with` block in `baseline_mapreduce.py`
- `[x]` Replaced `multiprocessing.Pool` with `ThreadPoolExecutor` in `optimized_mapreduce.py` (eliminated Windows process-spawn overhead — now shows correct speedup: ~4-10×)
- `[x]` Fixed CSS `@import` ordering issue for Google Fonts in Tailwind v4
