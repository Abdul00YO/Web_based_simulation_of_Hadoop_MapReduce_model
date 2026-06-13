"use client";

import { ExperimentResult } from "@/lib/types";

interface SpeedupGaugeProps {
  result: ExperimentResult;
}

export default function SpeedupGauge({ result }: SpeedupGaugeProps) {
  const speedup = result.comparison?.speedup ?? 1;
  const improvement = result.comparison?.improvement_percent ?? 0;
  const timeSaved = result.comparison?.time_saved_seconds ?? 0;
  const throughputImprovement = result.comparison?.throughput_improvement ?? 1;

  // Cap gauge at 10x for display
  const maxSpeedup = 10;
  const pct = Math.min((speedup / maxSpeedup) * 100, 100);

  // Needle angle: -90° (0x) to +90° (10x)
  const angle = -90 + (pct / 100) * 180;

  return (
    <div className="glass-card p-6">
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
        ⚡ Speedup Ratio
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Optimized vs Baseline performance
      </p>

      {/* SVG Gauge */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <svg width={200} height={115} viewBox="0 0 200 115">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(99,102,241,0.12)"
            strokeWidth={16}
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.513} 251.3`}
          />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {/* Needle */}
          <g transform={`rotate(${angle}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" stroke="#f1f5f9" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx="100" cy="100" r="6" fill="#6366f1" />
          </g>
          {/* Labels */}
          <text x="18" y="112" fill="#475569" fontSize="11" textAnchor="middle">1×</text>
          <text x="100" y="18" fill="#475569" fontSize="11" textAnchor="middle">5×</text>
          <text x="182" y="112" fill="#475569" fontSize="11" textAnchor="middle">10×</text>
          {/* Center value */}
          <text x="100" y="95" fill="#f1f5f9" fontSize="22" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {speedup.toFixed(2)}×
          </text>
        </svg>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div style={{ textAlign: "center", padding: "10px 6px", background: "rgba(99,102,241,0.08)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.15)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#818cf8" }}>
            {speedup.toFixed(2)}×
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Speedup</div>
        </div>
        <div style={{ textAlign: "center", padding: "10px 6px", background: "rgba(16,185,129,0.08)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.15)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#34d399" }}>
            {improvement.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Faster</div>
        </div>
        <div style={{ textAlign: "center", padding: "10px 6px", background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.15)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#fcd34d" }}>
            {timeSaved.toFixed(2)}s
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Saved</div>
        </div>
      </div>
    </div>
  );
}
