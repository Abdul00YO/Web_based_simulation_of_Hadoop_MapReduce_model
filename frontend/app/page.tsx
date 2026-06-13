"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { label: "Parallel Workers", value: "8", suffix: "cores" },
  { label: "Speedup Achieved", value: "4.2", suffix: "×" },
  { label: "Data Processed", value: "5M", suffix: "words" },
  { label: "Time Saved", value: "78", suffix: "%" },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "In-Memory Processing",
    desc: "Eliminates disk I/O overhead by keeping intermediate data in memory — the biggest Hadoop bottleneck.",
    color: "var(--accent-blue)",
  },
  {
    icon: "⚖️",
    title: "Dynamic Load Balancing",
    desc: "Workers pull tasks from a shared queue instead of static pre-assignment, preventing idle CPU time.",
    color: "var(--accent-green)",
  },
  {
    icon: "🔀",
    title: "Parallel Execution",
    desc: "Map and reduce tasks run concurrently across all CPU cores using Python multiprocessing.",
    color: "var(--accent-orange)",
  },
];

const PIPELINE_STEPS = [
  { id: "split", label: "Data Split", icon: "📂", desc: "Chunks input into parallel segments" },
  { id: "map",   label: "Map Phase",  icon: "🗺️", desc: "Workers emit (key, value) pairs" },
  { id: "shuffle", label: "Shuffle",  icon: "🔀", desc: "Groups values by key" },
  { id: "reduce", label: "Reduce",    icon: "📊", desc: "Aggregates final word counts" },
  { id: "output", label: "Output",    icon: "✅", desc: "Results returned to client" },
];

function AnimatedCounter({ target, suffix }: { target: string; suffix: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const numeric = parseFloat(target.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric)) { setDisplay(target); return; }
    const duration = 1800;
    const steps = 60;
    const step = numeric / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, numeric);
      const isInt = Number.isInteger(numeric);
      setDisplay((isInt ? Math.floor(current) : current.toFixed(1)) + (target.includes("M") ? "M" : ""));
      if (current >= numeric) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return <span>{display}{suffix}</span>;
}

export default function HomePage() {
  const [activeStep, setActiveStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % PIPELINE_STEPS.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="relative z-10 min-h-screen">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
        {/* Radial glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800, height: 800,
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="badge badge-blue mb-6 mx-auto" style={{ display: "inline-flex" }}>
            <span className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
            Parallel & Distributed Computing Research
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-none tracking-tight">
            <span className="shimmer-text">MapReduce</span>
            <br />
            <span style={{ color: "var(--text-primary)" }}>Performance</span>
            <br />
            <span className="gradient-text">Simulator</span>
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Compare traditional Hadoop-style MapReduce against a modern optimized system using
            in-memory processing, dynamic load balancing, and parallel execution.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/experiment">
              <button className="btn-primary" style={{ fontSize: 16, padding: "14px 36px", position: "relative", zIndex: 1 }}>
                🚀 Run Experiment
              </button>
            </Link>
            <Link href="/results">
              <button className="btn-secondary" style={{ fontSize: 16, padding: "14px 36px" }}>
                📊 View Results
              </button>
            </Link>
          </div>
        </div>

        {/* Floating pipeline preview */}
        <div className={`mt-20 w-full max-w-3xl transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="glass-card p-6">
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              MapReduce Pipeline
            </p>
            <div className="flex items-center justify-between gap-2">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2 flex-1">
                  <div
                    className="flex flex-col items-center gap-1 flex-1 p-2 rounded-xl transition-all duration-500 cursor-default"
                    style={{
                      background: activeStep === i ? "rgba(99,102,241,0.15)" : "transparent",
                      border: `1px solid ${activeStep === i ? "rgba(99,102,241,0.4)" : "transparent"}`,
                    }}
                  >
                    <span className="text-2xl">{step.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: activeStep === i ? "var(--accent-blue-bright)" : "var(--text-muted)" }}>
                      {step.label}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div style={{ width: 20, height: 2, background: activeStep > i ? "var(--accent-blue)" : "var(--border)", borderRadius: 1, flexShrink: 0, transition: "background 0.5s" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="glass-card p-6 text-center">
              <div className="metric-value gradient-text" style={{ fontSize: "2.2rem" }}>
                {mounted ? <AnimatedCounter target={stat.value} suffix={stat.suffix} /> : `${stat.value}${stat.suffix}`}
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">
              Three <span className="gradient-text">Optimization Techniques</span>
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Each technique targets a specific bottleneck in traditional MapReduce
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card p-8 text-center group">
                <div className="text-5xl mb-4 float" style={{ animationDelay: `${i * 0.5}s` }}>{f.icon}</div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Baseline */}
            <div className="glass-card p-8">
              <div className="badge badge-red mb-4">🐘 Baseline — Hadoop Style</div>
              <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Traditional MapReduce</h3>
              <ul className="space-y-3">
                {["Static task assignment (round-robin)", "Disk-based intermediate storage", "Sequential map → shuffle → reduce", "Synchronization barriers between phases", "Single-process execution"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-red)", flexShrink: 0 }}>✗</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Optimized */}
            <div className="glass-card glass-card-green p-8">
              <div className="badge badge-green mb-4">⚡ Optimized — PDC Enhanced</div>
              <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Optimized MapReduce</h3>
              <ul className="space-y-3">
                {["Dynamic queue-based task scheduling", "In-memory intermediate results", "Parallel multiprocessing execution", "No disk I/O between phases", "Full CPU core utilization"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-green)", flexShrink: 0 }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto glass-card p-12">
          <h2 className="text-3xl font-bold mb-4 gradient-text">Ready to Benchmark?</h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Select your dataset size, configure workers, and see the performance difference in real time.
          </p>
          <Link href="/experiment">
            <button className="btn-primary" style={{ fontSize: 18, padding: "16px 48px", position: "relative", zIndex: 1 }}>
              Start Experiment →
            </button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13 }}>
        MapReduce Simulation Platform · Parallel &amp; Distributed Computing Research
      </footer>
    </main>
  );
}
