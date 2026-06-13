"""
Dataset Generator Module
Generates large-scale synthetic text datasets for MapReduce experiments.
"""

import random
import string
from typing import List

# Rich vocabulary for generating realistic word-count workloads
VOCABULARY = [
    "data", "processing", "distributed", "computing", "parallel", "cluster",
    "node", "worker", "task", "scheduler", "memory", "disk", "hadoop", "spark",
    "mapreduce", "key", "value", "shuffle", "sort", "reduce", "map", "emit",
    "partition", "split", "chunk", "batch", "stream", "throughput", "latency",
    "performance", "optimization", "load", "balance", "fault", "tolerance",
    "replication", "consistency", "availability", "scalability", "efficiency",
    "algorithm", "framework", "pipeline", "stage", "phase", "execution",
    "resource", "allocation", "utilization", "bandwidth", "network", "storage",
    "cache", "buffer", "queue", "priority", "thread", "process", "core",
    "cpu", "ram", "io", "file", "block", "index", "hash", "tree", "graph",
    "matrix", "vector", "model", "training", "inference", "batch", "epoch",
    "gradient", "weight", "layer", "activation", "function", "loss",
    "accuracy", "precision", "recall", "metric", "benchmark", "experiment",
    "result", "analysis", "visualization", "dashboard", "report", "comparison",
    "baseline", "optimized", "speedup", "improvement", "overhead", "bottleneck",
    "synchronization", "communication", "coordination", "consensus", "election",
    "leader", "follower", "master", "slave", "replica", "shard", "segment",
    "record", "row", "column", "table", "database", "query", "index", "join",
    "aggregate", "filter", "project", "select", "group", "order", "limit",
]

# Dataset size configurations: (num_chunks, words_per_chunk)
DATASET_CONFIGS = {
    "small":   {"chunks": 10,   "words_per_chunk": 1_000,   "label": "Small (~10K words)"},
    "medium":  {"chunks": 20,   "words_per_chunk": 5_000,   "label": "Medium (~100K words)"},
    "large":   {"chunks": 40,   "words_per_chunk": 25_000,  "label": "Large (~1M words)"},
    "xlarge":  {"chunks": 80,   "words_per_chunk": 62_500,  "label": "X-Large (~5M words)"},
}


def generate_text_chunk(words_per_chunk: int, seed: int = None) -> str:
    """Generate a single text chunk of approximately `words_per_chunk` words."""
    rng = random.Random(seed)
    words = [rng.choice(VOCABULARY) for _ in range(words_per_chunk)]
    return " ".join(words)


def generate_dataset(size: str, num_workers: int = 4) -> dict:
    """
    Generate a synthetic dataset split into chunks, ready for MapReduce.

    Args:
        size: One of 'small', 'medium', 'large', 'xlarge'
        num_workers: Number of workers (used to size chunks appropriately)

    Returns:
        dict with 'chunks' (list of text strings) and metadata
    """
    if size not in DATASET_CONFIGS:
        raise ValueError(f"Invalid size '{size}'. Choose from: {list(DATASET_CONFIGS.keys())}")

    config = DATASET_CONFIGS[size]
    num_chunks = config["chunks"]
    words_per_chunk = config["words_per_chunk"]

    chunks = []
    for i in range(num_chunks):
        chunk = generate_text_chunk(words_per_chunk, seed=i * 42)
        chunks.append(chunk)

    total_words = num_chunks * words_per_chunk
    total_chars = sum(len(c) for c in chunks)

    return {
        "chunks": chunks,
        "num_chunks": num_chunks,
        "total_words": total_words,
        "total_chars": total_chars,
        "size_label": config["label"],
        "size_bytes": total_chars,
    }


def get_available_sizes() -> List[dict]:
    """Return metadata about all available dataset sizes."""
    return [
        {
            "key": key,
            "label": cfg["label"],
            "chunks": cfg["chunks"],
            "total_words": cfg["chunks"] * cfg["words_per_chunk"],
        }
        for key, cfg in DATASET_CONFIGS.items()
    ]
