"""
Database Module
SQLite-based persistence for storing experiment results history.
Allows users to compare results across multiple runs.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "experiments.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                dataset_size TEXT NOT NULL,
                num_workers INTEGER NOT NULL,
                mode TEXT NOT NULL,          -- 'baseline', 'optimized', 'compare'
                baseline_result TEXT,        -- JSON blob
                optimized_result TEXT,       -- JSON blob
                comparison TEXT              -- JSON blob (only for compare mode)
            )
        """)
        conn.commit()


def save_experiment(
    run_id: str,
    dataset_size: str,
    num_workers: int,
    mode: str,
    baseline_result: Optional[dict] = None,
    optimized_result: Optional[dict] = None,
    comparison: Optional[dict] = None,
) -> int:
    """Save experiment results to SQLite. Returns the new row ID."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO experiments
              (run_id, created_at, dataset_size, num_workers, mode,
               baseline_result, optimized_result, comparison)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                datetime.utcnow().isoformat(),
                dataset_size,
                num_workers,
                mode,
                json.dumps(baseline_result) if baseline_result else None,
                json.dumps(optimized_result) if optimized_result else None,
                json.dumps(comparison) if comparison else None,
            ),
        )
        conn.commit()
        return cursor.lastrowid


def get_all_experiments(limit: int = 50) -> List[dict]:
    """Retrieve the most recent experiment summaries."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, run_id, created_at, dataset_size, num_workers, mode,
                   baseline_result, optimized_result, comparison
            FROM experiments
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    results = []
    for row in rows:
        entry = dict(row)
        for field in ("baseline_result", "optimized_result", "comparison"):
            if entry[field]:
                entry[field] = json.loads(entry[field])
        results.append(entry)
    return results


def get_experiment_by_run_id(run_id: str) -> Optional[dict]:
    """Retrieve a single experiment by run_id."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM experiments WHERE run_id = ?", (run_id,)
        ).fetchone()
    if not row:
        return None
    entry = dict(row)
    for field in ("baseline_result", "optimized_result", "comparison"):
        if entry[field]:
            entry[field] = json.loads(entry[field])
    return entry


def delete_experiment(run_id: str) -> bool:
    """Delete an experiment by run_id."""
    with get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM experiments WHERE run_id = ?", (run_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
