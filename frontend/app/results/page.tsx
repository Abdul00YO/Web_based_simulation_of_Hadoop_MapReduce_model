"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import MetricCard from "@/components/MetricCard";
import SpeedupGauge from "@/components/SpeedupGauge";
import ResultsTable from "@/components/ResultsTable";
import {
  ExecutionTimeChart,
  PhaseBreakdownChart,
  ThroughputChart,
  CpuChart,
} from "@/components/ComparisonCharts";
import { ExperimentResult, HistoryEntry } from "@/lib/types";

const API = "http://localhost:8000";

const SIZE_LABELS: Record<string, string> = {
  small: "Small (~10K)",
  medium: "Medium (~100K)",
  large: "Large (~1M)",
  xlarge: "X-Large (~5M)",
};

function formatDate(iso: string) {
  return new Date(iso + "Z").toLocaleString();
}

function ResultsDashboard({ result }: { result: ExperimentResult }) {
  const hasComparison = result.mode === "compare" && result.baseline && result.optimized;
  const hasBaseline = !!result.baseline;
  const hasOptimized = !!result.optimized;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="glass-card p-6">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
              Run ID: <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--text-secondary)" }}>{result.run_id}</span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span className="badge badge-blue">📦 {SIZE_LABELS[result.dataset_size] || result.dataset_size}</span>
              <span className="badge badge-orange">👷 {result.num_workers} Workers</span>
              <span className="badge badge-green">
                {result.dataset_info?.total_words?.toLocaleString()} words
              </span>
              {result.mode === "compare" && <span className="badge badge-blue">⚖️ Comparison</span>}
            </div>
          </div>
          {hasComparison && result.comparison && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Overall Speedup</div>
              <div style={{
                fontSize: 36, fontFamily: "JetBrains Mono, monospace", fontWeight: 800,
                background: "linear-gradient(135deg, #818cf8, #34d399)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                {result.comparison.speedup.toFixed(2)}×
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Speedup gauge + metric cards */}
      {hasComparison && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SpeedupGauge result={result} />
          <MetricCard
            label="Execution Time"
            icon="⏱️"
            baselineValue={result.baseline?.total_duration_seconds ?? null}
            optimizedValue={result.optimized?.total_duration_seconds ?? null}
            unit="s"
            lowerIsBetter
            format={v => v.toFixed(3)}
          />
          <MetricCard
            label="Throughput"
            icon="🚀"
            baselineValue={result.baseline?.throughput_words_per_sec ?? null}
            optimizedValue={result.optimized?.throughput_words_per_sec ?? null}
            unit="w/s"
            lowerIsBetter={false}
            format={v => v >= 1000 ? (v / 1000).toFixed(1) + "K" : v.toFixed(0)}
          />
          <MetricCard
            label="Peak CPU"
            icon="🖥️"
            baselineValue={result.baseline?.peak_cpu_percent ?? null}
            optimizedValue={result.optimized?.peak_cpu_percent ?? null}
            unit="%"
            lowerIsBetter={false}
            format={v => v.toFixed(1)}
          />
          <MetricCard
            label="Peak Memory"
            icon="💾"
            baselineValue={result.baseline?.peak_memory_mb ?? null}
            optimizedValue={result.optimized?.peak_memory_mb ?? null}
            unit="MB"
            lowerIsBetter
            format={v => v.toFixed(1)}
          />
          <MetricCard
            label="Unique Words"
            icon="📝"
            baselineValue={result.baseline?.unique_words ?? null}
            optimizedValue={result.optimized?.unique_words ?? null}
            format={v => v.toLocaleString()}
          />
        </div>
      )}

      {/* Single-model display */}
      {!hasComparison && (hasBaseline || hasOptimized) && (
        <div className="glass-card p-6">
          {(() => {
            const m = result.baseline || result.optimized;
            if (!m) return null;
            return (
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Duration",    val: `${m.total_duration_seconds.toFixed(3)} s` },
                  { label: "Throughput",  val: `${Math.round(m.throughput_words_per_sec).toLocaleString()} w/s` },
                  { label: "Unique Words",val: m.unique_words.toLocaleString() },
                  { label: "Peak CPU",    val: `${m.peak_cpu_percent.toFixed(1)} %` },
                  { label: "Avg CPU",     val: `${m.avg_cpu_percent.toFixed(1)} %` },
                  { label: "Peak Memory", val: `${m.peak_memory_mb.toFixed(1)} MB` },
                ].map(item => (
                  <div key={item.label} style={{ padding: 16, background: "rgba(99,102,241,0.06)", borderRadius: 12, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.val}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Charts — only for compare mode */}
      {hasComparison && (
        <div className="grid md:grid-cols-2 gap-6">
          <ExecutionTimeChart result={result} />
          <PhaseBreakdownChart result={result} />
          <ThroughputChart result={result} />
          <CpuChart result={result} />
        </div>
      )}

      {/* Detailed table */}
      {(hasBaseline || hasOptimized) && <ResultsTable result={result} />}
    </div>
  );
}

function HistoryList({
  history,
  selectedId,
  onSelect,
  onDelete,
}: {
  history: HistoryEntry[];
  selectedId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (run_id: string) => void;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          📜 Experiment History
        </span>
      </div>
      {history.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No experiments yet. Run one first!
        </div>
      ) : (
        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {history.map(entry => {
            const isSelected = entry.run_id === selectedId;
            const modeColor = entry.mode === "compare" ? "#6366f1" : entry.mode === "optimized" ? "#10b981" : "#ef4444";
            return (
              <div
                key={entry.run_id}
                onClick={() => onSelect(entry)}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: isSelected ? "rgba(99,102,241,0.1)" : "transparent",
                  borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: modeColor + "22", color: modeColor, border: `1px solid ${modeColor}44` }}>
                        {entry.mode.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                        {SIZE_LABELS[entry.dataset_size] || entry.dataset_size}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {entry.num_workers}W
                      </span>
                    </div>
                    {entry.comparison && (
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: "#34d399", fontWeight: 700 }}>
                        {entry.comparison.speedup.toFixed(2)}× speedup
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(entry.run_id); }}
                    style={{ color: "var(--text-muted)", fontSize: 16, background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultsPageInner() {
  const params = useSearchParams();
  const runParam = params.get("run");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(runParam);
  const [selectedResult, setSelectedResult] = useState<ExperimentResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/api/history`);
      const data = await res.json();
      setHistory(data.experiments);

      // Auto-select from URL param or most recent
      const target = runParam || (data.experiments[0]?.run_id ?? null);
      if (target) {
        const entry = data.experiments.find((e: HistoryEntry) => e.run_id === target);
        if (entry) selectEntry(entry);
        else setSelectedId(null);
      }
    } catch {
      // backend not running
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const selectEntry = (entry: HistoryEntry) => {
    setSelectedId(entry.run_id);
    setSelectedResult({
      run_id: entry.run_id,
      dataset_size: entry.dataset_size,
      num_workers: entry.num_workers,
      mode: entry.mode as ExperimentResult["mode"],
      dataset_info: {
        num_chunks: 0,
        total_words: entry.baseline_result?.total_words || entry.optimized_result?.total_words || 0,
        size_bytes: 0,
      },
      baseline: entry.baseline_result,
      optimized: entry.optimized_result,
      comparison: entry.comparison,
    });
  };

  const deleteEntry = async (run_id: string) => {
    await fetch(`${API}/api/history/${run_id}`, { method: "DELETE" });
    if (selectedId === run_id) { setSelectedId(null); setSelectedResult(null); }
    loadHistory();
  };

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen pt-20 pb-16 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-10">
            <div className="badge badge-green mb-4">📊 Results & Analysis</div>
            <h1 className="text-4xl font-black mb-2">
              Experiment <span className="gradient-text">Results</span>
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Review performance metrics and compare MapReduce models across all runs.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 16px" }} />
              <div style={{ color: "var(--text-muted)" }}>Loading history…</div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar history */}
              <div className="lg:col-span-1">
                <HistoryList
                  history={history}
                  selectedId={selectedId}
                  onSelect={selectEntry}
                  onDelete={deleteEntry}
                />
              </div>

              {/* Main dashboard */}
              <div className="lg:col-span-3">
                {selectedResult ? (
                  <ResultsDashboard result={selectedResult} />
                ) : (
                  <div className="glass-card p-16 text-center">
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                      No Experiment Selected
                    </div>
                    <div style={{ color: "var(--text-muted)", marginBottom: 20 }}>
                      {history.length === 0
                        ? "Run your first experiment to see results here."
                        : "Select a run from the history list."}
                    </div>
                    {history.length === 0 && (
                      <a href="/experiment">
                        <button className="btn-primary" style={{ position: "relative", zIndex: 1 }}>
                          Run Experiment →
                        </button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ color: "white", textAlign: "center", paddingTop: 100 }}>Loading…</div>}>
      <ResultsPageInner />
    </Suspense>
  );
}
