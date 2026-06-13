"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { DatasetSizeOption, ExperimentMode, SSEEvent } from "@/lib/types";

const API = "http://localhost:8000";

const MODE_OPTIONS: { key: ExperimentMode; label: string; desc: string; color: string }[] = [
  { key: "baseline",  label: "🐘 Baseline Only",  desc: "Run traditional Hadoop-style MapReduce", color: "#ef4444" },
  { key: "optimized", label: "⚡ Optimized Only", desc: "Run in-memory parallel MapReduce",        color: "#10b981" },
  { key: "compare",   label: "⚖️ Compare Both",   desc: "Run both and see side-by-side results",   color: "#6366f1" },
];

const LOG_ICONS: Record<string, string> = {
  started: "🚀",
  dataset_ready: "📦",
  phase_start: "▶️",
  model_complete: "✅",
  result: "🎉",
  progress: "⏳",
};

export default function ExperimentPage() {
  const router = useRouter();
  const [sizes, setSizes] = useState<DatasetSizeOption[]>([]);
  const [selectedSize, setSelectedSize] = useState("small");
  const [selectedMode, setSelectedMode] = useState<ExperimentMode>("compare");
  const [numWorkers, setNumWorkers] = useState(4);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ text: string; icon: string; time: string }[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/dataset-sizes`)
      .then(r => r.json())
      .then(d => setSizes(d.sizes))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const addLog = (text: string, type: string) => {
    const now = new Date().toLocaleTimeString();
    setLog(prev => [...prev, { text, icon: LOG_ICONS[type] ?? "•", time: now }]);
  };

  const handleRun = async () => {
    setRunning(true);
    setDone(false);
    setLog([]);
    setCurrentPhase(null);
    setResultId(null);

    try {
      const response = await fetch(`${API}/api/run/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_size: selectedSize,
          num_workers: numWorkers,
          mode: selectedMode,
        }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              case "started":
                addLog("Experiment started. Generating dataset…", "started");
                setCurrentPhase("generating");
                break;
              case "dataset_ready":
                addLog(`Dataset ready: ${event.total_words?.toLocaleString()} words in ${event.num_chunks} chunks`, "dataset_ready");
                setCurrentPhase(null);
                break;
              case "phase_start":
                addLog(`Running ${event.model} model — ${event.phase} phase…`, "phase_start");
                setCurrentPhase(`${event.model}_${event.phase}`);
                break;
              case "model_complete":
                addLog(`${event.model} finished in ${event.duration?.toFixed(3)}s`, "model_complete");
                setCurrentPhase(null);
                break;
              case "result":
                addLog("All done! Results saved.", "result");
                setCurrentPhase(null);
                setDone(true);
                if (event.run_id) setResultId(event.run_id);
                break;
            }
          } catch { /* skip malformed events */ }
        }
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`, "error");
    } finally {
      setRunning(false);
    }
  };

  const selectedSizeInfo = sizes.find(s => s.key === selectedSize);

  const PHASES = [
    { id: "generating", label: "Generate" },
    { id: "baseline_map", label: "B: Map" },
    { id: "baseline_shuffle", label: "B: Shuffle" },
    { id: "baseline_reduce", label: "B: Reduce" },
    { id: "optimized_map", label: "O: Map" },
    { id: "optimized_shuffle", label: "O: Shuffle" },
    { id: "optimized_reduce", label: "O: Reduce" },
  ];

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-10">
            <div className="badge badge-blue mb-4">🧪 Experiment Configuration</div>
            <h1 className="text-4xl font-black mb-2">
              Run <span className="gradient-text">MapReduce</span> Benchmark
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Configure your experiment parameters and observe real-time execution.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {/* LEFT: Config panel */}
            <div className="md:col-span-3 space-y-6">

              {/* Dataset Size */}
              <div className="glass-card p-6">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                  📦 Dataset Size
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {sizes.length === 0
                    ? ["small","medium","large","xlarge"].map(s => (
                        <div key={s} className="glass-card p-3 animate-pulse" style={{ height: 70 }} />
                      ))
                    : sizes.map(size => (
                        <button
                          key={size.key}
                          onClick={() => setSelectedSize(size.key)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            border: `1px solid ${selectedSize === size.key ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
                            background: selectedSize === size.key ? "rgba(99,102,241,0.12)" : "rgba(15,23,42,0.5)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 700, color: selectedSize === size.key ? "var(--accent-blue-bright)" : "var(--text-primary)" }}>
                            {size.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                            {size.total_words.toLocaleString()} words · {size.chunks} chunks
                          </div>
                        </button>
                      ))
                  }
                </div>
              </div>

              {/* Workers */}
              <div className="glass-card p-6">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                  👷 Worker Nodes: <span style={{ color: "var(--accent-blue-bright)", fontFamily: "JetBrains Mono, monospace" }}>{numWorkers}</span>
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                  Simulated parallel worker processes (2–8)
                </p>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={numWorkers}
                  onChange={e => setNumWorkers(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-blue)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  <span>2</span><span>4</span><span>6</span><span>8</span>
                </div>
                {/* Worker dots visualisation */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: i < numWorkers ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.05)",
                        border: `1px solid ${i < numWorkers ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12,
                        transition: "all 0.2s",
                      }}
                    >
                      {i < numWorkers ? "⚙" : ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div className="glass-card p-6">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                  🎯 Execution Mode
                </h2>
                <div className="space-y-3">
                  {MODE_OPTIONS.map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => setSelectedMode(mode.key)}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: `1px solid ${selectedMode === mode.key ? mode.color + "55" : "var(--border)"}`,
                        background: selectedMode === mode.key ? mode.color + "15" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: selectedMode === mode.key ? mode.color : "var(--border)",
                        flexShrink: 0,
                        transition: "background 0.2s",
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: selectedMode === mode.key ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {mode.label}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{mode.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Run button */}
              <button
                className="btn-primary w-full"
                style={{ padding: "16px", fontSize: 17, width: "100%", position: "relative", zIndex: 1 }}
                onClick={handleRun}
                disabled={running}
              >
                {running ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <span className="spinner" /> Running Experiment…
                  </span>
                ) : "▶ Run Experiment"}
              </button>
            </div>

            {/* RIGHT: Live log */}
            <div className="md:col-span-2 space-y-4">
              {/* Progress phases */}
              {running && (
                <div className="glass-card p-4">
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Pipeline Progress
                  </div>
                  <div className="space-y-2">
                    {PHASES.map(phase => {
                      const isActive = currentPhase === phase.id;
                      return (
                        <div key={phase.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                            background: isActive ? "var(--accent-blue)" : "var(--border)",
                            boxShadow: isActive ? "0 0 8px rgba(99,102,241,0.8)" : "none",
                          }} className={isActive ? "pulse" : ""} />
                          <span style={{ fontSize: 12, color: isActive ? "var(--accent-blue-bright)" : "var(--text-muted)" }}>
                            {phase.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live log */}
              <div className="glass-card p-4" style={{ height: 400, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Execution Log
                </div>
                <div
                  ref={logRef}
                  style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {log.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", paddingTop: 40 }}>
                      Configure and click Run to start
                    </div>
                  ) : (
                    log.map((entry, i) => (
                      <div key={i} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ flexShrink: 0 }}>{entry.icon}</span>
                        <span style={{ color: "var(--text-secondary)", flex: 1 }}>{entry.text}</span>
                        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{entry.time}</span>
                      </div>
                    ))
                  )}
                  {running && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="pulse" style={{ fontSize: 12 }}>●</span>
                      <span style={{ fontSize: 12, color: "var(--accent-blue-bright)" }}>Processing…</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Success CTA */}
              {done && resultId && (
                <div className="glass-card glass-card-green p-4 text-center">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                    Experiment Complete!
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                    Results saved to history
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: "10px 20px", fontSize: 14, position: "relative", zIndex: 1 }}
                    onClick={() => router.push(`/results?run=${resultId}`)}
                  >
                    View Results →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
