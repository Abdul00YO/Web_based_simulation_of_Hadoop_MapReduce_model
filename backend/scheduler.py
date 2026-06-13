"""
Scheduler Module
Queue-based dynamic task scheduler for the optimized MapReduce model.
Distributes tasks to workers dynamically — workers pull tasks as they become free.
"""

import multiprocessing
from typing import List, Any, Callable, Tuple
from collections import defaultdict


class DynamicScheduler:
    """
    A queue-based dynamic task scheduler.

    Instead of statically pre-assigning tasks to workers (Hadoop-style),
    this scheduler maintains a shared task queue. Worker processes pull
    the next available task whenever they finish, ensuring balanced utilization.
    """

    def __init__(self, num_workers: int):
        self.num_workers = num_workers
        self.worker_task_counts: dict = defaultdict(int)

    def schedule_map_tasks(
        self,
        chunks: List[str],
        map_fn: Callable,
        pool: multiprocessing.Pool,
    ) -> Tuple[List[Any], dict]:
        """
        Schedule map tasks dynamically using imap_unordered.
        Workers pull tasks from the pool queue automatically.

        Args:
            chunks: List of text chunks (one per task)
            map_fn: The map worker function
            pool: Active multiprocessing.Pool

        Returns:
            (results_list, worker_stats)
        """
        # Tag each chunk with an index to track worker assignment
        indexed_chunks = [(i % self.num_workers, chunk) for i, chunk in enumerate(chunks)]
        results = []
        worker_stats = defaultdict(int)

        for worker_id, pairs in pool.imap_unordered(map_fn, indexed_chunks):
            results.extend(pairs)
            worker_stats[worker_id] += 1

        return results, dict(worker_stats)

    def schedule_reduce_tasks(
        self,
        partitions: List[dict],
        reduce_fn: Callable,
        pool: multiprocessing.Pool,
    ) -> List[dict]:
        """
        Schedule reduce tasks across partitions dynamically.

        Args:
            partitions: List of {key: [values]} dicts to reduce
            reduce_fn: The reduce worker function
            pool: Active multiprocessing.Pool

        Returns:
            List of partial result dicts
        """
        return list(pool.imap_unordered(reduce_fn, partitions))

    @staticmethod
    def partition_for_reduce(
        grouped_data: dict, num_partitions: int
    ) -> List[dict]:
        """
        Split grouped key-value data into N partitions for parallel reduce.
        Uses consistent hashing on key to assign keys to partitions.
        """
        partitions: List[dict] = [{} for _ in range(num_partitions)]
        for key, values in grouped_data.items():
            partition_idx = hash(key) % num_partitions
            partitions[partition_idx][key] = values
        # Remove empty partitions
        return [p for p in partitions if p]
