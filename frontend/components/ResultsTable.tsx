"use client";

import { ExperimentResult, ModelResult } from "@/lib/types";

interface ResultsTableProps {
  result: ExperimentResult;
}

function fmt(v: number | undefined | null, decimals = 3): string {
  if (v === undefined || v === null) return "—";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toFixed(decimals);
}

const ROWS: { label: string; key: keyof ModelResult; unit?: string; lowerBetter?: boolean }[] = [
  { label: "Total Duration",         key: "total_duration_seconds",  unit: "s",  lowerBetter: true  },
  { label: "Throughput",             key: "throughput_words_per_sec",unit: "w/s",lowerBetter: false },
  { label: "Peak CPU",               key: "peak_cpu_percent",        unit: "%",  lowerBetter: false },
  { label: "Avg CPU",                key: "avg_cpu_percent",         unit: "%",  lowerBetter: false },
  { label: "Peak Memory",            key: "peak_memory_mb",          unit: "MB", lowerBetter: true  },
  { label: "Total Words",            key: "total_words",             unit: ""                       },
  { label: "Unique Words",           key: "unique_words",            unit: ""                       },
];

export default function ResultsTable({ result }: ResultsTableProps) {
  const b = result.baseline;
  const o = result.optimized;

  return (
    <div className="glass-card p-6 overflow-x-auto">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
        📋 Detailed Metrics Table
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Metric
            </th>
            <th style={{ textAlign: "right", padding: "8px 12px", color: "#fca5a5", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Baseline
            </th>
            <th style={{ textAlign: "right", padding: "8px 12px", color: "#6ee7b7", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Optimized
            </th>
            <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Δ
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => {
            const bVal = b ? (b[row.key] as number) : null;
            const oVal = o ? (o[row.key] as number) : null;
            let delta: string = "—";
            let deltaColor = "var(--text-muted)";
            if (bVal !== null && oVal !== null && bVal !== 0 && row.lowerBetter !== undefined) {
              const diff = row.lowerBetter
                ? ((bVal - oVal) / bVal) * 100
                : ((oVal - bVal) / bVal) * 100;
              delta = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
              deltaColor = diff > 0 ? "var(--accent-green-bright)" : "#fca5a5";
            }
            return (
              <tr
                key={row.key}
                style={{
                  borderBottom: "1px solid rgba(99,102,241,0.07)",
                  background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)",
                }}
              >
                <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {row.label}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#fca5a5" }}>
                  {bVal !== null ? `${fmt(bVal)}${row.unit ? " " + row.unit : ""}` : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#6ee7b7" }}>
                  {oVal !== null ? `${fmt(oVal)}${row.unit ? " " + row.unit : ""}` : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: deltaColor, fontWeight: 600 }}>
                  {delta}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Phase breakdown rows */}
      {(b?.phases || o?.phases) && (
        <>
          <div style={{ marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Phase Timings
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {["Map", "Shuffle", "Reduce"].map((phase, i) => {
                const bp = b?.phases.find(p => p.phase_name === phase);
                const op = o?.phases.find(p => p.phase_name === phase);
                const bv = bp?.duration_seconds ?? null;
                const ov = op?.duration_seconds ?? null;
                let delta = "—";
                let deltaColor = "var(--text-muted)";
                if (bv !== null && ov !== null && bv !== 0) {
                  const diff = ((bv - ov) / bv) * 100;
                  delta = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
                  deltaColor = diff > 0 ? "var(--accent-green-bright)" : "#fca5a5";
                }
                const phaseColors = ["#6366f1", "#f59e0b", "#10b981"];
                return (
                  <tr key={phase} style={{ borderBottom: "1px solid rgba(99,102,241,0.07)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: phaseColors[i], marginRight: 8 }} />
                      {phase} Phase
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#fca5a5" }}>
                      {bv !== null ? `${bv.toFixed(4)} s` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#6ee7b7" }}>
                      {ov !== null ? `${ov.toFixed(4)} s` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: deltaColor, fontWeight: 600 }}>
                      {delta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
