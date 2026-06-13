// Shared TypeScript types for the MapReduce simulation platform

export interface PhaseMetric {
  phase_name: string;
  duration_seconds: number;
  records_processed: number;
}

export interface ModelResult {
  model: "baseline" | "optimized";
  dataset_size: string;
  num_workers: number;
  total_words: number;
  unique_words: number;
  total_duration_seconds: number;
  throughput_words_per_sec: number;
  peak_cpu_percent: number;
  avg_cpu_percent: number;
  peak_memory_mb: number;
  speedup: number | null;
  phases: PhaseMetric[];
}

export interface ComparisonStats {
  speedup: number;
  time_saved_seconds: number;
  improvement_percent: number;
  throughput_improvement: number;
}

export interface DatasetInfo {
  num_chunks: number;
  total_words: number;
  size_bytes: number;
}

export interface ExperimentResult {
  run_id: string;
  dataset_size: string;
  num_workers: number;
  mode: "baseline" | "optimized" | "compare";
  dataset_info: DatasetInfo;
  baseline: ModelResult | null;
  optimized: ModelResult | null;
  comparison: ComparisonStats | null;
}

export interface HistoryEntry {
  id: number;
  run_id: string;
  created_at: string;
  dataset_size: string;
  num_workers: number;
  mode: string;
  baseline_result: ModelResult | null;
  optimized_result: ModelResult | null;
  comparison: ComparisonStats | null;
}

export interface DatasetSizeOption {
  key: string;
  label: string;
  chunks: number;
  total_words: number;
}

export type ExperimentMode = "baseline" | "optimized" | "compare";

export type DatasetSize = "small" | "medium" | "large" | "xlarge";

export interface SSEEvent {
  type: "started" | "dataset_ready" | "phase_start" | "model_complete" | "result" | "progress";
  message?: string;
  total_words?: number;
  num_chunks?: number;
  model?: string;
  phase?: string;
  duration?: number;
  pct?: number;
  // result fields
  run_id?: string;
  dataset_size?: string;
  num_workers?: number;
  mode?: string;
  dataset_info?: DatasetInfo;
  baseline?: ModelResult;
  optimized?: ModelResult;
  comparison?: ComparisonStats;
}
