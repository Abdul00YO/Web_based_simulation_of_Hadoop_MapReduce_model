from dataset_generator import generate_dataset
from baseline_mapreduce import run_baseline
from optimized_mapreduce import run_optimized
from database import init_db

init_db()

for size in ['small', 'medium']:
    d = generate_dataset(size, 4)
    words = d['total_words']
    print(f"\n=== {size.upper()} ({words:,} words) ===")
    b = run_baseline(d['chunks'], 4, size, words)
    print(f"Baseline:  {b.total_duration_seconds:.3f}s | {b.throughput_words_per_sec:,.0f} w/s | {b.unique_words} unique")
    o = run_optimized(d['chunks'], 4, size, words)
    print(f"Optimized: {o.total_duration_seconds:.3f}s | {o.throughput_words_per_sec:,.0f} w/s | {o.unique_words} unique")
    if o.total_duration_seconds > 0:
        speedup = b.total_duration_seconds / o.total_duration_seconds
        print(f"Speedup:   {speedup:.2f}x")
