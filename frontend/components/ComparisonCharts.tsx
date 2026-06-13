"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { ExperimentResult, PhaseMetric } from "@/lib/types";

interface ComparisonChartProps {
  result: ExperimentResult;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 10,
    color: "#f1f5f9",
    fontSize: 13,
  },
  labelStyle: { color: "#94a3b8", fontWeight: 600 },
};

// ─── Execution Time Bar ───────────────────────────────────
export function ExecutionTimeChart({ result }: ComparisonChartProps) {
  const data = [];
  if (result.baseline) {
    data.push({ name: "Baseline", time: parseFloat(result.baseline.total_duration_seconds.toFixed(3)), fill: "#ef4444" });
  }
  if (result.optimized) {
    data.push({ name: "Optimized", time: parseFloat(result.optimized.total_duration_seconds.toFixed(3)), fill: "#10b981" });
  }

  return (
    <div className="glass-card p-6">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
        ⏱️ Execution Time Comparison
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Lower is better</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={60}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} unit="s" />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}s`, "Duration"]} />
          <Bar dataKey="time" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <rect key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Phase Breakdown Stacked Bar ──────────────────────────
export function PhaseBreakdownChart({ result }: ComparisonChartProps) {
  interface PhaseData {
    model: string;
    Map?: number;
    Shuffle?: number;
    Reduce?: number;
  }

  const buildRow = (phases: PhaseMetric[], model: string): PhaseData => {
    const row: PhaseData = { model };
    for (const p of phases) {
      const key = p.phase_name as keyof PhaseData;
      if (key !== "model") {
        row[key] = parseFloat(p.duration_seconds.toFixed(4));
      }
    }
    return row;
  };

  const data: PhaseData[] = [];
  if (result.baseline?.phases) data.push(buildRow(result.baseline.phases, "Baseline"));
  if (result.optimized?.phases) data.push(buildRow(result.optimized.phases, "Optimized"));

  return (
    <div className="glass-card p-6">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
        📊 Phase Breakdown
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Time per phase (seconds)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
          <XAxis dataKey="model" tick={{ fill: "#94a3b8", fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} unit="s" />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}s`, ""]} />
          <Legend wrapperStyle={{ fontSize: 13, color: "#94a3b8" }} />
          <Bar dataKey="Map" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Shuffle" stackId="a" fill="#f59e0b" />
          <Bar dataKey="Reduce" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Throughput Chart ─────────────────────────────────────
export function ThroughputChart({ result }: ComparisonChartProps) {
  const data = [];
  if (result.baseline) {
    data.push({
      name: "Baseline",
      throughput: Math.round(result.baseline.throughput_words_per_sec),
    });
  }
  if (result.optimized) {
    data.push({
      name: "Optimized",
      throughput: Math.round(result.optimized.throughput_words_per_sec),
    });
  }

  return (
    <div className="glass-card p-6">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
        🚀 Throughput
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Words processed per second</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={60}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString()} words/s`, "Throughput"]} />
          <Bar dataKey="throughput" fill="#818cf8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── CPU Utilization Chart ────────────────────────────────
export function CpuChart({ result }: ComparisonChartProps) {
  const data = [
    {
      metric: "Peak CPU %",
      baseline: result.baseline?.peak_cpu_percent ?? 0,
      optimized: result.optimized?.peak_cpu_percent ?? 0,
    },
    {
      metric: "Avg CPU %",
      baseline: result.baseline?.avg_cpu_percent ?? 0,
      optimized: result.optimized?.avg_cpu_percent ?? 0,
    },
    {
      metric: "Memory (MB)",
      baseline: result.baseline?.peak_memory_mb ?? 0,
      optimized: result.optimized?.peak_memory_mb ?? 0,
    },
  ];

  return (
    <div className="glass-card p-6">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
        🖥️ Resource Utilization
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>CPU & memory comparison</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
          <XAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 13, color: "#94a3b8" }} />
          <Bar dataKey="baseline" name="Baseline" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="optimized" name="Optimized" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
