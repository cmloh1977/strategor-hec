"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Swords, Target, Zap, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Loader2, Star, TrendingUp, TrendingDown, AlertTriangle, FileDown } from "lucide-react";
import { generateReportPDF } from "@/lib/generateReportPDF";
import clsx from "clsx";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import type { MyAnalysis, AIAnalysis } from "@/lib/PortfolioContext";

interface StrategicHealthCardProps {
  analysis: MyAnalysis;
  shareCode: string | null;
}


function getGradeInfo(score: number) {
  if (score >= 80) return { grade: "A", color: "#10b981" };
  if (score >= 65) return { grade: "B", color: "#3b82f6" };
  if (score >= 50) return { grade: "C", color: "#f59e0b" };
  if (score >= 35) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

export default function StrategicHealthCard({ analysis, shareCode }: StrategicHealthCardProps) {
  const { user } = useAuth();
  const [aiData, setAiData] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const hasFetched = useRef(false);

  const saveToFirestore = async (data: AIAnalysis) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "portfolio", "healthAnalysis"), {
        ...data,
        updatedAt: new Date().toISOString(),
        businessName: analysis.businessName,
      });
    } catch (e) {
      console.error("Failed to save health analysis:", e);
    }
  };

  const loadFromFirestore = async (): Promise<AIAnalysis | null> => {
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid, "portfolio", "healthAnalysis"));
      if (snap.exists()) {
        const cached = snap.data() as AIAnalysis & { businessName?: string };
        // Only use cache if it matches the current analysis
        if (cached.businessName === analysis.businessName) {
          return cached;
        }
      }
    } catch (e) {
      console.error("Failed to load health analysis:", e);
    }
    return null;
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiData(data);
      await saveToFirestore(data);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    }
    setAnalyzing(false);
  };

  // Load from Firestore first, else run fresh analysis
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    (async () => {
      setAnalyzing(true);
      const cached = await loadFromFirestore();
      if (cached) {
        setAiData(cached);
        setAnalyzing(false);
      } else {
        await runAnalysis();
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ──
  if (analyzing && !aiData) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Strategic Health Card</p>
              <h3 className="text-xl font-bold">{analysis.businessName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{analysis.ownerName} · {analysis.ownerRegion}</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-slate-700/50 border-2 border-slate-600 animate-pulse">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">analyzing...</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
          <p className="text-sm text-indigo-700 font-medium">AI is analyzing your strategic frameworks...</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-slate-100 animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2 w-16 bg-slate-50 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                <div className="h-2 w-3/4 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-2 w-5/6 bg-slate-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !aiData) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Strategic Health Card</p>
          <h3 className="text-xl font-bold">{analysis.businessName}</h3>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-red-600 mb-3">⚠️ {error}</p>
          <button onClick={runAnalysis} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!aiData) return null;

  // ── AI data is ready ──
  const { grade, color } = getGradeInfo(aiData.healthScore);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
      {/* Header Band */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Strategic Health Card</p>
            <h3 className="text-xl font-bold">{analysis.businessName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{analysis.ownerName} · {analysis.ownerRegion}</p>
          </div>
          <div className="text-center">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
              style={{ backgroundColor: color + "22", border: `2px solid ${color}`, color }}
            >
              {grade}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{aiData.healthScore}/100</p>
          </div>
        </div>
      </div>

      {/* 4-Quadrant Grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
        {/* Q1: Business Model */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Business Model</h4>
              <p className="text-[10px] text-slate-400">Odyssey 3.14</p>
            </div>
          </div>
          <div className="space-y-2">
            <ScoreRow label="Value Proposition" score={aiData.businessModel.valueProposition.score} insight={aiData.businessModel.valueProposition.insight} />
            <ScoreRow label="Value Architecture" score={aiData.businessModel.valueArchitecture.score} insight={aiData.businessModel.valueArchitecture.insight} />
            <ScoreRow label="Contributions" score={aiData.businessModel.contributions.score} insight={aiData.businessModel.contributions.insight} />
          </div>
        </div>

        {/* Q2: Competitive Pressure — Threat Meter */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Swords className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Competitive Pressure</h4>
              <p className="text-[10px] text-slate-400">Porter&apos;s 5 Forces</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mb-2 ml-9">Threat level: <span className="text-emerald-500">■</span> Low → <span className="text-amber-500">■</span> Moderate → <span className="text-red-500">■</span> High</p>
          <div className="space-y-1.5">
            <ThreatMeter label="New Entrants" severity={aiData.fiveForces.newEntrants.severity} />
            <ThreatMeter label="Suppliers" severity={aiData.fiveForces.suppliers.severity} />
            <ThreatMeter label="Rivalry" severity={aiData.fiveForces.rivalry.severity} />
            <ThreatMeter label="Buyers" severity={aiData.fiveForces.buyers.severity} />
            <ThreatMeter label="Substitutes" severity={aiData.fiveForces.substitutes.severity} />
          </div>
          <p className="text-[10px] font-medium text-slate-500 mt-2.5">Industry Attractiveness: <span className={clsx(
            "font-bold",
            aiData.fiveForces.overallAttractiveness === "High" ? "text-emerald-600" :
            aiData.fiveForces.overallAttractiveness === "Moderate" ? "text-amber-600" : "text-red-600"
          )}>{aiData.fiveForces.overallAttractiveness}</span></p>
        </div>

        {/* Q3: VRIO Resource Advantage */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Resource Advantage</h4>
              <p className="text-[10px] text-slate-400">VRIO Framework</p>
            </div>
          </div>
          <div className="space-y-2">
            <VRIOBar label="V" full="Valuable" strength={aiData.vrio.valuable.strength} insight={aiData.vrio.valuable.insight} />
            <VRIOBar label="R" full="Rare" strength={aiData.vrio.rare.strength} insight={aiData.vrio.rare.insight} />
            <VRIOBar label="I" full="Inimitable" strength={aiData.vrio.inimitable.strength} insight={aiData.vrio.inimitable.insight} />
            <VRIOBar label="O" full="Organized" strength={aiData.vrio.organized.strength} insight={aiData.vrio.organized.insight} />
            <div className={clsx(
              "rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-center mt-1",
              aiData.vrio.competitiveAdvantage === "Sustained" && "bg-emerald-50 text-emerald-700",
              aiData.vrio.competitiveAdvantage === "Temporary" && "bg-amber-50 text-amber-700",
              aiData.vrio.competitiveAdvantage === "Parity" && "bg-slate-50 text-slate-600",
              aiData.vrio.competitiveAdvantage === "Disadvantage" && "bg-red-50 text-red-700",
            )}>
              {aiData.vrio.competitiveAdvantage} Competitive Advantage
            </div>
          </div>
        </div>

        {/* Q4: SWOT Strategic Position */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Strategic Position</h4>
              <p className="text-[10px] text-slate-400">SWOT Synthesis</p>
            </div>
          </div>
          <SWOTBalance swot={aiData.swot} />
        </div>
      </div>

      {/* AI Narrative + Priorities */}
      <div className="border-t border-slate-100">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-slate-800">AI Strategic Assessment</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{aiData.narrative}</p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-slate-600" />
            <h4 className="text-xs font-bold text-slate-800">Top Strategic Priorities</h4>
          </div>
          <div className="space-y-2">
            {aiData.priorities.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={clsx(
                  "mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                  p.urgency === "high" ? "bg-red-500" : p.urgency === "medium" ? "bg-amber-500" : "bg-emerald-500"
                )}>{i + 1}</span>
                <p className="text-xs text-slate-700 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {analyzing ? "Re-analyzing..." : "Re-analyze"}
          </button>
          <button
            onClick={async () => {
              if (!aiData) return;
              setGeneratingReport(true);
              try {
                const res = await fetch("/api/generate-report", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ analysis, aiScores: aiData }),
                });
                if (!res.ok) throw new Error("Report generation failed");
                const report = await res.json();
                generateReportPDF(
                  report,
                  aiData,
                  analysis.businessName,
                  analysis.ownerName,
                  analysis.ownerRegion,
                  {
                    businessModel: analysis.businessModel,
                    fiveForces: analysis.fiveForces,
                    vrio: analysis.vrio,
                    swot: analysis.swot,
                  }
                );
              } catch (err) {
                console.error("Report generation error:", err);
                alert("Failed to generate report. Please try again.");
              }
              setGeneratingReport(false);
            }}
            disabled={generatingReport || !aiData}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            {generatingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
            {generatingReport ? "Generating Report..." : "Download Full Report"}
          </button>
        </div>
      </div>

      {shareCode && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Share Code</span>
          <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">{shareCode}</span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function ScoreRow({ label, score, insight }: { label: string; score: number; insight: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-medium text-slate-600">{label}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={clsx("h-3 w-3", i < score ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
          ))}
        </div>
      </div>
      <p className="text-[9px] text-slate-400 italic leading-tight">{insight}</p>
    </div>
  );
}

// 5 Forces: Segmented threat meter (5 blocks, green→red)
function ThreatMeter({ label, severity }: { label: string; severity: number }) {
  const segments = 5;
  const filledCount = Math.round((severity / 10) * segments);

  const getSegmentColor = (idx: number, filled: boolean) => {
    if (!filled) return "bg-slate-100";
    if (idx <= 1) return "bg-emerald-400";
    if (idx <= 2) return "bg-amber-400";
    if (idx <= 3) return "bg-orange-400";
    return "bg-red-500";
  };

  const textLabel = severity <= 3 ? "Low" : severity <= 6 ? "Moderate" : severity <= 8 ? "High" : "Very High";
  const textColor = severity <= 3 ? "text-emerald-600" : severity <= 6 ? "text-amber-600" : severity <= 8 ? "text-orange-600" : "text-red-600";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-20 truncate">{label}</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-2 flex-1 rounded-sm transition-all",
              getSegmentColor(i, i < filledCount)
            )}
          />
        ))}
      </div>
      <span className={clsx("text-[9px] font-bold w-16 text-right", textColor)}>{textLabel}</span>
    </div>
  );
}

function VRIOBar({ label, full, strength, insight }: { label: string; full: string; strength: number; insight: string }) {
  const pct = (strength / 5) * 100;
  const barColor = strength >= 4 ? "#10b981" : strength >= 3 ? "#f59e0b" : strength >= 2 ? "#f97316" : "#ef4444";

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded w-5 h-5 flex items-center justify-center">{label}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-slate-600 font-medium">{full}</span>
            <span className="text-[9px] font-bold text-slate-500">{strength}/5</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 italic ml-7 mt-0.5 leading-tight">{insight}</p>
    </div>
  );
}

// SWOT: Positive (S/O) vs Negative (W/T) with directional indicators
function SWOTBalance({ swot }: { swot: AIAnalysis["swot"] }) {
  const positiveWeight = swot.strengthsWeight + swot.opportunitiesWeight;
  const negativeWeight = swot.weaknessesWeight + swot.threatsWeight;
  const balance = positiveWeight - negativeWeight;

  let verdict: string;
  let verdictIcon: "up" | "down" | "neutral";
  if (balance > 4) { verdict = "Strong strategic position"; verdictIcon = "up"; }
  else if (balance > 0) { verdict = "Favorable with caution areas"; verdictIcon = "up"; }
  else if (balance === 0) { verdict = "Balanced — needs clear strategy"; verdictIcon = "neutral"; }
  else if (balance > -4) { verdict = "Vulnerable — act on strengths"; verdictIcon = "down"; }
  else { verdict = "High risk — defensive strategy needed"; verdictIcon = "down"; }

  return (
    <>
      {/* Positive factors (higher = better) */}
      <p className="text-[9px] text-emerald-600 font-semibold mb-1 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> Strategic Assets <span className="text-slate-400 font-normal">(higher = stronger)</span>
      </p>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <PositiveBlock label="Strengths" weight={swot.strengthsWeight} color="emerald" />
        <PositiveBlock label="Opportunities" weight={swot.opportunitiesWeight} color="blue" />
      </div>

      {/* Negative factors (higher = worse) */}
      <p className="text-[9px] text-red-500 font-semibold mb-1 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> Strategic Risks <span className="text-slate-400 font-normal">(higher = more critical)</span>
      </p>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <NegativeBlock label="Weaknesses" weight={swot.weaknessesWeight} color="red" />
        <NegativeBlock label="Threats" weight={swot.threatsWeight} color="orange" />
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        {verdictIcon === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
        {verdictIcon === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
        {verdictIcon === "neutral" && <Minus className="h-3 w-3 text-amber-500" />}
        <p className="text-[10px] font-medium text-slate-600">{verdict}</p>
      </div>
    </>
  );
}

function PositiveBlock({ label, weight, color }: { label: string; weight: number; color: string }) {
  const bgColors: Record<string, string> = { emerald: "bg-emerald-50 border-emerald-200", blue: "bg-blue-50 border-blue-200" };
  const textColors: Record<string, string> = { emerald: "text-emerald-700", blue: "text-blue-700" };
  const barColors: Record<string, string> = { emerald: "bg-emerald-400", blue: "bg-blue-400" };

  return (
    <div className={clsx("rounded-lg px-2 py-1.5 border", bgColors[color])}>
      <div className="flex items-center justify-between mb-1">
        <span className={clsx("text-[9px] font-semibold", textColors[color])}>{label}</span>
        <span className={clsx("text-[10px] font-bold", textColors[color])}>{weight}/10</span>
      </div>
      <div className="h-1 bg-white/60 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", barColors[color])} style={{ width: `${weight * 10}%` }} />
      </div>
    </div>
  );
}

function NegativeBlock({ label, weight, color }: { label: string; weight: number; color: string }) {
  const bgColors: Record<string, string> = { red: "bg-red-50 border-red-200", orange: "bg-orange-50 border-orange-200" };
  const textColors: Record<string, string> = { red: "text-red-700", orange: "text-orange-700" };
  const barColors: Record<string, string> = { red: "bg-red-400", orange: "bg-orange-400" };

  return (
    <div className={clsx("rounded-lg px-2 py-1.5 border", bgColors[color])}>
      <div className="flex items-center justify-between mb-1">
        <span className={clsx("text-[9px] font-semibold", textColors[color])}>{label}</span>
        <span className={clsx("text-[10px] font-bold", textColors[color])}>{weight}/10</span>
      </div>
      <div className="h-1 bg-white/60 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", barColors[color])} style={{ width: `${weight * 10}%` }} />
      </div>
    </div>
  );
}
