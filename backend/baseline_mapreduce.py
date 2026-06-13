"""
Baseline MapReduce Module
Simulates traditional Hadoop-style MapReduce with intentional limitations:
  - Disk-based intermediate storage (writes key-value pairs to tmp/ files)
  - Static task assignment (round-robin, pre-assigned at start)
  - Sequential (single-process) execution of map and reduce tasks
  - Synchronization barriers between phases (no pipelining)

These limitations mirror real Hadoop behavior and are the bottlenecks
the optimized model addresses.
"""

import os
import time
import json
import shutil
from typing import List, Dict
from collections import defaultdict

from worker import map_task, shuffle_and_sort, reduce_task
from benchmarking import BenchmarkResult, PhaseMetric, ResourceMonitor

# Directory for intermediate disk storage (simulates HDFS temp files)
TMP_DIR = os.path.join(os.path.dirname(__file__), "tmp")


def _ensure_tmp_dir():
    os.makedirs(TMP_DIR, exist_ok=True)


def _cleanup_tmp_dir():
    if os.path.exists(TMP_DIR):
        shutil.rmtree(TMP_DIR)


def _write_map_output_to_disk(worker_id: int, pairs: list):
    """Simulate disk-based intermediate storage: write map output to a JSON file."""
    path = os.path.join(TMP_DIR, f"map_output_worker_{worker_id}.json")
    with open(path, "w") as f:
        json.dump(pairs, f)
        # Simulate disk flush latency (fsync)
        f.flush()


def _read_map_outputs_from_disk(num_workers: int) -> list:
    """Read all intermediate map outputs back from disk."""
    all_pairs = []
    for i in range(num_workers):
        path = os.path.join(TMP_DIR, f"map_output_worker_{i}.json")
        if os.path.exists(path):
            with open(path, "r") as f:
                pairs = json.load(f)
            all_pairs.extend([tuple(p) for p in pairs])
    return all_pairs


def _write_shuffle_output_to_disk(grouped: dict):
    """Write shuffled/grouped data to disk before reduce phase."""
    path = os.path.join(TMP_DIR, "shuffle_output.json")
    with open(path, "w") as f:
        json.dump(grouped, f)
        f.flush()


def _read_shuffle_output_from_disk() -> dict:
    """Read the grouped data back from disk for reduce phase."""
    path = os.path.join(TMP_DIR, "shuffle_output.json")
    with open(path, "r") as f:
        return json.load(f)


def run_baseline(
    chunks: List[str],
    num_workers: int,
    dataset_size: str,
    total_words: int,
    progress_callback=None,
) -> BenchmarkResult:
    """
    Execute baseline (Hadoop-style) MapReduce on the given chunks.

    Args:
        chunks: List of text chunks from the dataset
        num_workers: Number of simulated workers (for static assignment)
        dataset_size: Size label (for reporting)
        total_words: Total word count (for throughput calculation)
        progress_callback: Optional callable(phase, pct) for SSE progress

    Returns:
        BenchmarkResult with all metrics
    """
    _ensure_tmp_dir()
    monitor = ResourceMonitor(interval=0.05)
    monitor.start()

    overall_start = time.perf_counter()
    phases: List[PhaseMetric] = []

    # ──────────────────────────────────────────────
    # PHASE 1: MAP (Sequential, disk-write after each worker)
    # Static assignment: round-robin chunks to workers
    # ──────────────────────────────────────────────
    if progress_callback:
        progress_callback("map", 0)

    map_start = time.perf_counter()

    # Build static worker->chunks assignment
    worker_chunks: Dict[int, List[str]] = defaultdict(list)
    for i, chunk in enumerate(chunks):
        worker_id = i % num_workers  # Static round-robin assignment
        worker_chunks[worker_id].append(chunk)

    # Each worker processes sequentially (no parallelism)
    for worker_id in range(num_workers):
        worker_pairs = []
        for chunk in worker_chunks.get(worker_id, []):
            worker_pairs.extend(map_task(chunk))
        # Write to disk after each worker finishes (simulating HDFS write)
        _write_map_output_to_disk(worker_id, worker_pairs)

    map_duration = time.perf_counter() - map_start
    phases.append(PhaseMetric("Map", map_duration, total_words))

    if progress_callback:
        progress_callback("map", 100)

    # ──────────────────────────────────────────────
    # PHASE 2: SHUFFLE & SORT (Read from disk → group → write back to disk)
    # ──────────────────────────────────────────────
    if progress_callback:
        progress_callback("shuffle", 0)

    shuffle_start = time.perf_counter()

    all_pairs = _read_map_outputs_from_disk(num_workers)  # Disk read
    grouped = shuffle_and_sort(all_pairs)
    _write_shuffle_output_to_disk(grouped)                 # Disk write

    shuffle_duration = time.perf_counter() - shuffle_start
    phases.append(PhaseMetric("Shuffle", shuffle_duration, len(all_pairs)))

    if progress_callback:
        progress_callback("shuffle", 100)

    # ──────────────────────────────────────────────
    # PHASE 3: REDUCE (Sequential, reads from disk)
    # ──────────────────────────────────────────────
    if progress_callback:
        progress_callback("reduce", 0)

    reduce_start = time.perf_counter()

    grouped_from_disk = _read_shuffle_output_from_disk()   # Disk read
    final_results: Dict[str, int] = {}
    for key, values in grouped_from_disk.items():
        _, count = reduce_task((key, values))
        final_results[key] = count

    reduce_duration = time.perf_counter() - reduce_start
    phases.append(PhaseMetric("Reduce", reduce_duration, len(grouped_from_disk)))

    if progress_callback:
        progress_callback("reduce", 100)

    # ──────────────────────────────────────────────
    # Cleanup & Metrics
    # ──────────────────────────────────────────────
    _cleanup_tmp_dir()
    monitor.stop()

    total_duration = time.perf_counter() - overall_start
    throughput = total_words / total_duration if total_duration > 0 else 0

    return BenchmarkResult(
        model="baseline",
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
