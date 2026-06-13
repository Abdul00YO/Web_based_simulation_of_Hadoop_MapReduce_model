"use client";

import { ModelResult } from "@/lib/types";

interface MetricCardProps {
  label: string;
  baselineValue: number | string | null;
  optimizedValue: number | string | null;
  unit?: string;
  lowerIsBetter?: boolean;
  format?: (v: number) => string;
  icon?: string;
}

function formatDefault(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toFixed(2);
}

export default function MetricCard({
  label,
  baselineValue,
  optimizedValue,
  unit = "",
  lowerIsBetter = false,
  format = formatDefault,
  icon = "📊",
}: MetricCardProps) {
  const bNum = typeof baselineValue === "number" ? baselineValue : null;
  const oNum = typeof optimizedValue === "number" ? optimizedValue : null;

  let improvement: number | null = null;
  let optimizedWins = false;
  if (bNum !== null && oNum !== null && bNum !== 0) {
    improvement = lowerIsBetter
      ? ((bNum - oNum) / bNum) * 100
      : ((oNum - bNum) / bNum) * 100;
    optimizedWins = improvement > 0;
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Baseline */}
        <div style={{ padding: "12px", background: "rgba(239,68,68,0.06)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.15)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>BASELINE</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#fca5a5" }}>
            {bNum !== null ? format(bNum) : "—"}
            {unit && <span style={{ fontSize: 12, marginLeft: 3, color: "var(--text-muted)" }}>{unit}</span>}
          </div>
        </div>

        {/* Optimized */}
        <div style={{ padding: "12px", background: "rgba(16,185,129,0.06)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.15)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>OPTIMIZED</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#6ee7b7" }}>
            {oNum !== null ? format(oNum) : "—"}
            {unit && <span style={{ fontSize: 12, marginLeft: 3, color: "var(--text-muted)" }}>{unit}</span>}
          </div>
        </div>
      </div>

      {improvement !== null && (
        <div style={{
          marginTop: 10,
          padding: "6px 12px",
          borderRadius: 8,
          background: optimizedWins ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${optimizedWins ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          fontSize: 12,
          fontWeight: 600,
          color: optimizedWins ? "var(--accent-green-bright)" : "#fca5a5",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span>{optimizedWins ? "↑" : "↓"}</span>
          <span>{Math.abs(improvement).toFixed(1)}% {optimizedWins ? "improvement" : "regression"}</span>
        </div>
      )}
    </div>
  );
}
