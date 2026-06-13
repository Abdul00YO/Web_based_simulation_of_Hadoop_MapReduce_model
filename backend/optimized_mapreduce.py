"""
Optimized MapReduce Module
Implements high-performance MapReduce using three key PDC techniques:

1. IN-MEMORY PROCESSING
   Intermediate results stay in Python data structures (never touch disk).
   Eliminates the massive I/O overhead of Hadoop's disk-based shuffle.

2. DYNAMIC LOAD BALANCING
   Workers pull tasks from a shared queue as they finish, rather than
   being statically pre-assigned. This prevents idle workers when chunk
   sizes vary.

3. PARALLEL TASK EXECUTION
   Uses concurrent.futures.ThreadPoolExecutor to run map and reduce tasks
   concurrently across multiple threads, avoiding Windows process-spawn
   overhead while preserving true parallelism for I/O-bound work.
"""

import time
import threading
import queue
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
from collections import defaultdict

from worker import map_task, reduce_partition, merge_results
from benchmarking import BenchmarkResult, PhaseMetric, ResourceMonitor


def run_optimized(
    chunks: List[str],
    num_workers: int,
    dataset_size: str,
    total_words: int,
    progress_callback=None,
) -> BenchmarkResult:
    """
    Execute optimized MapReduce on the given chunks using:
      - In-memory intermediate storage (no disk I/O)
      - Parallel execution via ThreadPoolExecutor
      - Dynamic load balancing via queue-based scheduling

    Args:
        chunks: List of text chunks from the dataset
        num_workers: Number of parallel worker threads
        dataset_size: Size label (for reporting)
        total_words: Total word count (for throughput calculation)
        progress_callback: Optional callable(phase, pct) for SSE progress

    Returns:
        BenchmarkResult with all metrics
    """
    monitor = ResourceMonitor(interval=0.05)
    monitor.start()

    overall_start = time.perf_counter()
    phases: List[PhaseMetric] = []

    # ──────────────────────────────────────────────
    # PHASE 1: MAP (Parallel threads, in-memory output)
    # Dynamic queue: threads pull chunks as they become free.
    # ──────────────────────────────────────────────
    if progress_callback:
        progress_callback("map", 0)

    map_start = time.perf_counter()

    # Build dynamic task queue (workers pull, not push)
    task_queue: queue.Queue = queue.Queue()
    for i, chunk in enumerate(chunks):
        task_queue.put((i, chunk))

    all_pairs: List = []
    pairs_lock = threading.Lock()
    worker_stats: Dict[int, int] = defaultdict(int)
    stats_lock = threading.Lock()

    def dynamic_map_worker(worker_id: int):
        """Thread worker: pulls tasks from queue until empty."""
        local_pairs = []
        local_count = 0
        while True:
            try:
                idx, chunk = task_queue.get_nowait()
            except queue.Empty:
                break
            local_pairs.extend(map_task(chunk))
            local_count += 1
            task_queue.task_done()
        with pairs_lock:
            all_pairs.extend(local_pairs)
        with stats_lock:
            worker_stats[worker_id] += local_count

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(dynamic_map_worker, wid) for wid in range(num_workers)]
        for f in as_completed(futures):
            f.result()  # surface any exceptions

    map_duration = time.perf_counter() - map_start
    phases.append(PhaseMetric("Map", map_duration, total_words))

    if progress_callback:
        progress_callback("map", 100)

    # ──────────────────────────────────────────────
    # PHASE 2: SHUFFLE & SORT (In-memory grouping)
    # No disk I/O — pure in-memory hash grouping.
    # ──────────────────────────────────────────────
    if progress_callback:
        progress_callback("shuffle", 0)

    shuffle_start = time.perf_counter()

    grouped: Dict[str, list] = defaultdict(list)
    for key, value in all_pairs:
        grouped[key].append(value)
    grouped = dict(grouped)

    # Partition grouped data for parallel reduce
    keys = list(grouped.keys())
    partition_size = max(1, len(keys) // num_workers)
    partitions: List[Dict] = []
    for i in range(0, len(keys), partition_size):
        part_keys = keys[i:i + partition_size]
        partitions.append({k: grouped[k] for k in part_keys})

    shuffle_duration = time.perf_counter() - shuffle_start
    phases.append(PhaseMetric("Shuffle", shuffle_duration, len(all_pairs)))

    if progress_callback:
        progress_callback("shuffle", 100)

    # ──────────────────────────────────────────────
    # PHASE 3: REDUCE (Parallel threads, in-memory)
    # Each partition is reduced by a separate thread simultaneously.
    # ──────────────────────────────────────────────
    if progress_callback:
        progress_callback("reduce", 0)

    reduce_start = time.perf_counter()

    partial_results = []
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = {executor.submit(reduce_partition, partition): partition for partition in partitions}
        for f in as_completed(futures):
            partial_results.append(f.result())

    final_results = merge_results(partial_results)

    reduce_duration = time.perf_counter() - reduce_start
    phases.append(PhaseMetric("Reduce", reduce_duration, len(grouped)))

    if progress_callback:
        progress_callback("reduce", 100)

    # ──────────────────────────────────────────────
    # Cleanup & Metrics
    # ──────────────────────────────────────────────
    monitor.stop()

    total_duration = time.perf_counter() - overall_start
    throughput = total_words / total_duration if total_duration > 0 else 0

    return BenchmarkResult(
        model="optimized",
        dataset_size=dataset_size,
        num_workers=num_workers,
        total_words=total_words,
        unique_words=len(final_results),
        total_duration_seconds=total_duration,
        phases=phases,
        peak_cpu_percent=monitor.peak_cpu,
        avg_cpu_percent=monitor.avg_cpu,
        peak_memory_mb=monitor.peak_memory_mb,
        throughput_words_per_sec=throughput,
    )
