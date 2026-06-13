"""
Benchmarking Module
Measures execution time, CPU utilization, memory usage, and throughput.
"""

import time
import psutil
import os
import threading
from dataclasses import dataclass, field
from typing import Optional, List, Dict


@dataclass
class PhaseMetric:
    """Timing and resource metrics for a single MapReduce phase."""
    phase_name: str
    duration_seconds: float
    records_processed: int = 0


@dataclass
class BenchmarkResult:
    """Full benchmark result for a MapReduce run."""
    model: str                          # "baseline" or "optimized"
    dataset_size: str
    num_workers: int
    total_words: int
    unique_words: int

    # Timing
    total_duration_seconds: float
    phases: List[PhaseMetric] = field(default_factory=list)

    # Resource metrics
    peak_cpu_percent: float = 0.0
    avg_cpu_percent: float = 0.0
    peak_memory_mb: float = 0.0

    # Derived metrics
    throughput_words_per_sec: float = 0.0
    speedup: Optional[float] = None     # Filled in when comparing two runs

    def to_dict(self) -> dict:
        return {
            "model": self.model,
            "dataset_size": self.dataset_size,
            "num_workers": self.num_workers,
            "total_words": self.total_words,
            "unique_words": self.unique_words,
            "total_duration_seconds": round(self.total_duration_seconds, 4),
            "throughput_words_per_sec": round(self.throughput_words_per_sec, 2),
            "peak_cpu_percent": round(self.peak_cpu_percent, 2),
            "avg_cpu_percent": round(self.avg_cpu_percent, 2),
            "peak_memory_mb": round(self.peak_memory_mb, 2),
            "speedup": round(self.speedup, 3) if self.speedup else None,
            "phases": [
                {
                    "phase_name": p.phase_name,
                    "duration_seconds": round(p.duration_seconds, 4),
                    "records_processed": p.records_processed,
                }
                for p in self.phases
            ],
        }


class ResourceMonitor:
    """
    Background thread that samples CPU and memory usage during a job.
    Start before the job, stop after, then read peak/avg values.
    """

    def __init__(self, interval: float = 0.1):
        self.interval = interval
        self.cpu_samples: List[float] = []
        self.memory_samples: List[float] = []
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._process = psutil.Process(os.getpid())

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._sample_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=2)

    def _sample_loop(self):
        while not self._stop_event.is_set():
            try:
                cpu = psutil.cpu_percent(interval=None)
                mem = self._process.memory_info().rss / (1024 * 1024)  # MB
                self.cpu_samples.append(cpu)
                self.memory_samples.append(mem)
            except Exception:
                pass
            time.sleep(self.interval)

    @property
    def peak_cpu(self) -> float:
        return max(self.cpu_samples, default=0.0)

    @property
    def avg_cpu(self) -> float:
        if not self.cpu_samples:
            return 0.0
        return sum(self.cpu_samples) / len(self.cpu_samples)

    @property
    def peak_memory_mb(self) -> float:
        return max(self.memory_samples, default=0.0)


def compute_speedup(baseline: BenchmarkResult, optimized: BenchmarkResult) -> float:
    """Compute speedup ratio: baseline_time / optimized_time."""
    if optimized.total_duration_seconds == 0:
        return float("inf")
    return baseline.total_duration_seconds / optimized.total_duration_seconds


def build_comparison_report(baseline: BenchmarkResult, optimized: BenchmarkResult) -> dict:
    """
    Build a side-by-side comparison report for the frontend dashboard.
    """
    speedup = compute_speedup(baseline, optimized)
    baseline.speedup = speedup
    optimized.speedup = speedup

    time_saved = baseline.total_duration_seconds - optimized.total_duration_seconds
    improvement_pct = (time_saved / baseline.total_duration_seconds) * 100 if baseline.total_duration_seconds > 0 else 0

    return {
        "baseline": baseline.to_dict(),
        "optimized": optimized.to_dict(),
        "comparison": {
            "speedup": round(speedup, 3),
            "time_saved_seconds": round(time_saved, 4),
            "improvement_percent": round(improvement_pct, 2),
            "throughput_improvement": round(
                optimized.throughput_words_per_sec / max(baseline.throughput_words_per_sec, 0.001), 3
            ),
        },
    }
