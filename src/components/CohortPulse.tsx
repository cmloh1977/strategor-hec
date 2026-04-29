"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, X } from "lucide-react";
import clsx from "clsx";

interface PulseParticipant {
  name: string;
  email: string;
  cohort?: string;
  businessName?: string;
  ownerRegion?: string;
  progressPercent: number;
  status: "Not Started" | "In Progress" | "Completed";
  modules: {
    businessModel: { done: number; total: number };
    fiveForces: { done: number; total: number };
    vrio: { done: number; total: number };
    swot: { done: number; total: number };
  };
  engagement: {
    totalUserMessages: number;
    modulesWithChat: number;
    score: number;
    label: string;
  };
}

interface CohortPulseProps {
  participants: PulseParticipant[];
  cohortName: string;
  onClose: () => void;
}

export default function CohortPulse({ participants, cohortName, onClose }: CohortPulseProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // ── Compute aggregate stats ──
  const total = participants.length;
  const completed = participants.filter(p => p.status === "Completed").length;
  const inProgress = participants.filter(p => p.status === "In Progress").length;
  const notStarted = participants.filter(p => p.status === "Not Started").length;

  // Module completion rates
  const moduleStats = {
    businessModel: { label: "Business Model", done: 0, total: 0 },
    fiveForces: { label: "Five Forces", done: 0, total: 0 },
    vrio: { label: "VRIO Analysis", done: 0, total: 0 },
    swot: { label: "SWOT Synthesis", done: 0, total: 0 },
  };
  for (const p of participants) {
    moduleStats.businessModel.done += p.modules.businessModel.done;
    moduleStats.businessModel.total += p.modules.businessModel.total;
    moduleStats.fiveForces.done += p.modules.fiveForces.done;
    moduleStats.fiveForces.total += p.modules.fiveForces.total;
    moduleStats.vrio.done += p.modules.vrio.done;
    moduleStats.vrio.total += p.modules.vrio.total;
    moduleStats.swot.done += p.modules.swot.done;
    moduleStats.swot.total += p.modules.swot.total;
  }

  // Business diversity
  const uniqueBusinesses = new Set(participants.map(p => p.businessName).filter(Boolean)).size;
  const uniqueRegions = new Set(participants.map(p => p.ownerRegion).filter(Boolean)).size;

  // Top 3 engaged (by engagement score, must have score > 0)
  const topEngaged = [...participants]
    .filter(p => p.engagement.score > 0)
    .sort((a, b) => b.engagement.score - a.engagement.score)
    .slice(0, 3);

  // Overall average progress
  const avgProgress = total > 0 ? Math.round(participants.reduce((sum, p) => sum + p.progressPercent, 0) / total) : 0;

  // Still need to complete
  const needsWork = total - completed;

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `cohort-pulse-${cohortName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExporting(false);
  };

  const modulePercent = (m: { done: number; total: number }) =>
    m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;

  const emojis = ["🎯", "🔍", "💎", "⚡"];
  const moduleKeys = ["businessModel", "fiveForces", "vrio", "swot"] as const;
  const moduleColors = ["#E8634A", "#1EB5C4", "#6366f1", "#f59e0b"];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Cohort Pulse Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? "Exporting..." : "Download PNG"}
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ═══ THE INFOGRAPHIC ═══ */}
        <div ref={cardRef} style={{ width: "480px", padding: "0" }}>
          {/* Gradient Header */}
          <div style={{
            background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
            padding: "28px 32px 24px",
            color: "white",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px",
              }}>⚡</div>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, opacity: 0.7 }}>
                COHORT PULSE
              </span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "8px 0 4px", lineHeight: 1.2 }}>
              {cohortName}
            </h1>
            <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>
              Strategy Coach Progress Report · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Collective Impact Banner */}
          <div style={{
            background: "linear-gradient(135deg, #fef3c7, #fde68a)",
            padding: "16px 32px",
            borderBottom: "1px solid #fbbf24",
          }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#92400e", margin: "0 0 2px", lineHeight: 1.4 }}>
              🏔️ Your cohort has collectively analyzed{" "}
              <span style={{ color: "#b45309" }}>{uniqueBusinesses} businesses</span>
              {uniqueRegions > 1 && <> across <span style={{ color: "#b45309" }}>{uniqueRegions} regions</span></>}
            </p>
            <p style={{ fontSize: "11px", color: "#a16207", margin: 0 }}>
              {total} participants · Average progress: {avgProgress}%
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 32px" }}>

            {/* Status Ring */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                <StatusPill count={completed} label="Completed" color="#10b981" bgColor="#ecfdf5" />
                <StatusPill count={inProgress} label="In Progress" color="#f59e0b" bgColor="#fffbeb" />
                <StatusPill count={notStarted} label="Not Started" color="#94a3b8" bgColor="#f8fafc" />
              </div>
            </div>

            {/* Module Progress Wave */}
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: "10px" }}>
                📊 MODULE PROGRESS
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                {moduleKeys.map((key, i) => {
                  const pct = modulePercent(moduleStats[key]);
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "13px", width: "20px", textAlign: "center" as const }}>{emojis[i]}</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569", width: "100px" }}>
                        {moduleStats[key].label}
                      </span>
                      <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: "5px",
                          background: `linear-gradient(90deg, ${moduleColors[i]}, ${moduleColors[i]}dd)`,
                          width: `${pct}%`,
                          transition: "width 0.5s",
                        }} />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", width: "36px", textAlign: "right" as const }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spotlight Stars */}
            {topEngaged.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: "10px" }}>
                  🌟 MOST THOUGHTFUL ANALYSTS
                </p>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                  {topEngaged.map((p, i) => (
                    <div key={p.email} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", borderRadius: "10px",
                      background: i === 0 ? "linear-gradient(135deg, #fef3c7, #fde68a)" : "#f8fafc",
                      border: i === 0 ? "1px solid #fbbf24" : "1px solid #e2e8f0",
                    }}>
                      <span style={{ fontSize: "16px" }}>{["🥇", "🥈", "🥉"][i]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                          {p.name}
                        </p>
                        <p style={{ fontSize: "10px", color: "#64748b", margin: 0 }}>
                          {p.engagement.totalUserMessages} messages · {p.engagement.modulesWithChat}/4 modules
                        </p>
                      </div>
                      <div style={{
                        fontSize: "11px", fontWeight: 700,
                        color: i === 0 ? "#b45309" : "#6366f1",
                        background: i === 0 ? "#fef3c7" : "#eef2ff",
                        padding: "2px 8px", borderRadius: "6px",
                      }}>
                        {p.engagement.score} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* The Nudge */}
            {needsWork > 0 && (
              <div style={{
                padding: "14px 16px", borderRadius: "12px",
                background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                border: "1px solid #93c5fd",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px" }}>⏰</span>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af", margin: 0 }}>
                      {needsWork} participant{needsWork > 1 ? "s" : ""} still {needsWork > 1 ? "have" : "has"} modules to complete
                    </p>
                    <p style={{ fontSize: "10px", color: "#3b82f6", margin: "2px 0 0" }}>
                      Don't let your team down — every analysis strengthens the constellation!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 32px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>
              HEC Strategy Coach · Powered by the Strategor Framework
            </span>
            <span style={{ fontSize: "9px", color: "#cbd5e1" }}>
              Generated {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small inline component for status pills
function StatusPill({ count, label, color, bgColor }: { count: number; label: string; color: string; bgColor: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "6px 10px", borderRadius: "8px",
      background: bgColor, border: `1px solid ${color}22`,
      flex: 1,
    }}>
      <span style={{ fontSize: "18px", fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
      <span style={{ fontSize: "9px", fontWeight: 600, color, textTransform: "uppercase" as const, letterSpacing: "0.5px", lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}
