"""
Worker Module
Simulates distributed worker nodes performing Map and Reduce operations.
Each function is designed to be run in a separate process to simulate parallelism.
"""

from collections import defaultdict
from typing import List, Tuple, Dict


# ─────────────────────────────────────────────
#  MAP FUNCTIONS
# ─────────────────────────────────────────────

def map_task(chunk: str) -> List[Tuple[str, int]]:
    """
    Map phase: tokenize a text chunk and emit (word, 1) pairs.
    This is the core mapper function run by each worker.

    Args:
        chunk: A string of text to process

    Returns:
        List of (word, 1) tuples
    """
    pairs = []
    for word in chunk.split():
        # Normalize: lowercase, strip punctuation
        cleaned = word.lower().strip(".,!?;:\"'()[]{}-_")
        if cleaned:
            pairs.append((cleaned, 1))
    return pairs


def map_task_with_worker_id(args: Tuple[int, str]) -> Tuple[int, List[Tuple[str, int]]]:
    """
    Wrapper that returns (worker_id, results) for tracking per-worker stats.
    Used by the optimized parallel model.
    """
    worker_id, chunk = args
    return (worker_id, map_task(chunk))


# ─────────────────────────────────────────────
#  SHUFFLE / SORT FUNCTIONS
# ─────────────────────────────────────────────

def shuffle_and_sort(mapped_pairs: List[Tuple[str, int]]) -> Dict[str, List[int]]:
    """
    Shuffle & Sort phase: group all values by key.

    Args:
        mapped_pairs: Flat list of (word, 1) tuples from all mappers

    Returns:
        Dict mapping word -> [list of counts]
    """
    grouped: Dict[str, List[int]] = defaultdict(list)
    for key, value in mapped_pairs:
        grouped[key].append(value)
    return dict(grouped)


# ─────────────────────────────────────────────
#  REDUCE FUNCTIONS
# ─────────────────────────────────────────────

def reduce_task(key_values: Tuple[str, List[int]]) -> Tuple[str, int]:
    """
    Reduce phase: sum all values for a given key (word count aggregation).

    Args:
        key_values: (word, [list of counts])

    Returns:
        (word, total_count) tuple
    """
    key, values = key_values
    return (key, sum(values))


def reduce_partition(partition: Dict[str, List[int]]) -> Dict[str, int]:
    """
    Reduce an entire partition (dict) of key->[values] mappings.
    Used by the optimized parallel reduce phase.

    Args:
        partition: Dict of {word: [counts]}

    Returns:
        Dict of {word: total_count}
    """
    return {key: sum(values) for key, values in partition.items()}


def merge_results(partial_results: List[Dict[str, int]]) -> Dict[str, int]:
    """
    Merge multiple partial reduce results into a final word count dict.
    Used after parallel reduce workers finish.
    """
    final: Dict[str, int] = defaultdict(int)
    for partial in partial_results:
        for word, count in partial.items():
            final[word] += count
    return dict(final)
