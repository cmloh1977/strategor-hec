"use client";

import { useState } from "react";
import { CheckCircle2, Shield, Swords, Target, Zap, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Loader2, Star, AlertTriangle, TrendingUp } from "lucide-react";
import clsx from "clsx";
import type { MyAnalysis } from "@/lib/PortfolioContext";

interface StrategicHealthCardProps {
  analysis: MyAnalysis;
  shareCode: string | null;
}

interface AIAnalysis {
  businessModel: {
    valueProposition: { score: number; insight: string };
    valueArchitecture: { score: number; insight: string };
    contributions: { score: number; insight: string };
  };
  fiveForces: {
    newEntrants: { severity: number; label: string };
    suppliers: { severity: number; label: string };
    rivalry: { severity: number; label: string };
    buyers: { severity: number; label: string };
    substitutes: { severity: number; label: string };
    overallAttractiveness: string;
  };
  vrio: {
    valuable: { strength: number; insight: string };
    rare: { strength: number; insight: string };
    inimitable: { strength: number; insight: string };
    organized: { strength: number; insight: string };
    competitiveAdvantage: string;
  };
  swot: {
    strengthsWeight: number;
    weaknessesWeight: number;
    opportunitiesWeight: number;
    threatsWeight: number;
  };
  narrative: string;
  priorities: { urgency: string; text: string }[];
  healthScore: number;
}

// ── Fallback scoring (used before AI analysis) ──
function deriveBasicInsights(a: MyAnalysis) {
  const bmDepth = a.businessModel.valueProposition.points.length +
    a.businessModel.valueArchitecture.points.length +
    a.businessModel.contributions.points.length;

  const forcePointCounts = {
    newEntrants: a.fiveForces.newEntrants.points.length,
    suppliers: a.fiveForces.suppliers.points.length,
    rivalry: a.fiveForces.rivalry.points.length,
    buyers: a.fiveForces.buyers.points.length,
    substitutes: a.fiveForces.substitutes.points.length,
  };

  const vrioMet = {
    valuable: a.vrio.valuable.populated,
    rare: a.vrio.rare.populated,
    inimitable: a.vrio.inimitable.populated,
    organized: a.vrio.organized.populated,
  };
  const vrioCount = Object.values(vrioMet).filter(Boolean).length;

  const strengthCount = a.swot.strengths.points.length;
  const weaknessCount = a.swot.weaknesses.points.length;
  const oppCount = a.swot.opportunities.points.length;
  const threatCount = a.swot.threats.points.length;

  const bmScore = Math.min(5, Math.round(bmDepth / 2));
  const competitivePressure = Math.min(5, Math.round(Object.values(forcePointCounts).reduce((s, v) => s + v, 0) / 3));
  const swotBalance = (strengthCount + oppCount) - (weaknessCount + threatCount);

  const healthScore = Math.min(100, Math.round(
    (bmScore / 5 * 25) +
    ((5 - competitivePressure) / 5 * 20) +
    (vrioCount / 4 * 30) +
    (Math.max(0, Math.min(5, swotBalance + 3)) / 6 * 25)
  ));

  let healthGrade: string;
  let healthColor: string;
  if (healthScore >= 80) { healthGrade = "A"; healthColor = "#10b981"; }
  else if (healthScore >= 65) { healthGrade = "B"; healthColor = "#3b82f6"; }
  else if (healthScore >= 50) { healthGrade = "C"; healthColor = "#f59e0b"; }
  else if (healthScore >= 35) { healthGrade = "D"; healthColor = "#f97316"; }
  else { healthGrade = "F"; healthColor = "#ef4444"; }

  return {
    bmDepth, forcePointCounts, vrioMet, vrioCount,
    strengthCount, weaknessCount, oppCount, threatCount,
    healthScore, healthGrade, healthColor,
  };
}

function getGradeInfo(score: number) {
  if (score >= 80) return { grade: "A", color: "#10b981" };
  if (score >= 65) return { grade: "B", color: "#3b82f6" };
  if (score >= 50) return { grade: "C", color: "#f59e0b" };
  if (score >= 35) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

export default function StrategicHealthCard({ analysis, shareCode }: StrategicHealthCardProps) {
  const basic = deriveBasicInsights(analysis);
  const [aiData, setAiData] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
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
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    }
    setAnalyzing(false);
  };

  const score = aiData?.healthScore ?? basic.healthScore;
  const { grade, color } = getGradeInfo(score);

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
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{score}/100</p>
          </div>
        </div>
      </div>

      {/* AI Analyze Button */}
      {!aiData && (
        <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60 shadow-sm"
          >
            {analyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing with AI...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate AI Strategic Insights</>
            )}
          </button>
          {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
        </div>
      )}

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
          {aiData ? (
            <div className="space-y-2">
              <ScoreRow label="Value Proposition" score={aiData.businessModel.valueProposition.score} insight={aiData.businessModel.valueProposition.insight} color="blue" />
              <ScoreRow label="Value Architecture" score={aiData.businessModel.valueArchitecture.score} insight={aiData.businessModel.valueArchitecture.insight} color="blue" />
              <ScoreRow label="Contributions" score={aiData.businessModel.contributions.score} insight={aiData.businessModel.contributions.insight} color="blue" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <MiniBar label="Value Proposition" count={analysis.businessModel.valueProposition.points.length} max={5} color="#3b82f6" />
              <MiniBar label="Value Architecture" count={analysis.businessModel.valueArchitecture.points.length} max={5} color="#3b82f6" />
              <MiniBar label="Contributions" count={analysis.businessModel.contributions.points.length} max={5} color="#3b82f6" />
              <p className="text-[10px] text-slate-400 mt-2">{basic.bmDepth} key elements defined</p>
            </div>
          )}
        </div>

        {/* Q2: Competitive Pressure */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Swords className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Competitive Pressure</h4>
              <p className="text-[10px] text-slate-400">Porter's 5 Forces</p>
            </div>
          </div>
          {aiData ? (
            <div className="space-y-1.5">
              <SeverityBar label="New Entrants" severity={aiData.fiveForces.newEntrants.severity} tag={aiData.fiveForces.newEntrants.label} />
              <SeverityBar label="Suppliers" severity={aiData.fiveForces.suppliers.severity} tag={aiData.fiveForces.suppliers.label} />
              <SeverityBar label="Rivalry" severity={aiData.fiveForces.rivalry.severity} tag={aiData.fiveForces.rivalry.label} />
              <SeverityBar label="Buyers" severity={aiData.fiveForces.buyers.severity} tag={aiData.fiveForces.buyers.label} />
              <SeverityBar label="Substitutes" severity={aiData.fiveForces.substitutes.severity} tag={aiData.fiveForces.substitutes.label} />
              <p className="text-[10px] font-medium text-slate-500 mt-2">Industry Attractiveness: <span className={clsx(
                "font-bold",
                aiData.fiveForces.overallAttractiveness === "High" ? "text-emerald-600" :
                aiData.fiveForces.overallAttractiveness === "Moderate" ? "text-amber-600" : "text-red-600"
              )}>{aiData.fiveForces.overallAttractiveness}</span></p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <ForceIndicator label="New Entrants" count={basic.forcePointCounts.newEntrants} />
              <ForceIndicator label="Suppliers" count={basic.forcePointCounts.suppliers} />
              <ForceIndicator label="Rivalry" count={basic.forcePointCounts.rivalry} />
              <ForceIndicator label="Buyers" count={basic.forcePointCounts.buyers} />
              <ForceIndicator label="Substitutes" count={basic.forcePointCounts.substitutes} />
            </div>
          )}
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
          {aiData ? (
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
          ) : (
            <>
              <div className="flex items-center gap-1 mb-2">
                {(["valuable", "rare", "inimitable", "organized"] as const).map((k) => (
                  <div
                    key={k}
                    className={clsx(
                      "flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-wider",
                      basic.vrioMet[k]
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-300 border border-slate-100"
                    )}
                  >
                    {k.charAt(0)}
                  </div>
                ))}
              </div>
              <div className={clsx(
                "rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-center",
                basic.vrioCount === 4 && "bg-emerald-50 text-emerald-700",
                basic.vrioCount === 3 && "bg-amber-50 text-amber-700",
                basic.vrioCount === 2 && "bg-orange-50 text-orange-700",
                basic.vrioCount <= 1 && "bg-slate-50 text-slate-500",
              )}>
                {basic.vrioCount === 4 ? "Sustained Competitive Advantage" :
                 basic.vrioCount === 3 ? "Unused Competitive Advantage" :
                 basic.vrioCount === 2 ? "Temporary Competitive Advantage" :
                 basic.vrioCount === 1 ? "Competitive Parity" : "Competitive Disadvantage"}
              </div>
            </>
          )}
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
          {aiData ? (
            <SWOTQuadrant swot={aiData.swot} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <SwotCell label="Strengths" count={basic.strengthCount} color="emerald" />
                <SwotCell label="Weaknesses" count={basic.weaknessCount} color="red" />
                <SwotCell label="Opportunities" count={basic.oppCount} color="blue" />
                <SwotCell label="Threats" count={basic.threatCount} color="orange" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Narrative + Priorities */}
      {aiData && (
        <div className="border-t border-slate-100">
          {/* Strategic Narrative */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-slate-800">AI Strategic Assessment</h4>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{aiData.narrative}</p>
          </div>

          {/* Top 3 Priorities */}
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

          {/* Re-analyze button */}
          <div className="px-6 py-3 border-t border-slate-100">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Re-analyze
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
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

function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={clsx("h-3 w-3", i < score ? "text-amber-400 fill-amber-400" : "text-slate-200")}
        />
      ))}
    </div>
  );
}

function ScoreRow({ label, score, insight, color }: { label: string; score: number; insight: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-medium text-slate-600">{label}</span>
        <StarRating score={score} />
      </div>
      <p className="text-[9px] text-slate-400 italic leading-tight">{insight}</p>
    </div>
  );
}

function SeverityBar({ label, severity, tag }: { label: string; severity: number; tag: string }) {
  const pct = (severity / 10) * 100;
  const barColor = severity <= 3 ? "#10b981" : severity <= 6 ? "#f59e0b" : severity <= 8 ? "#f97316" : "#ef4444";
  const textColor = severity <= 3 ? "text-emerald-600" : severity <= 6 ? "text-amber-600" : severity <= 8 ? "text-orange-600" : "text-red-600";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-20 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <span className={clsx("text-[9px] font-bold w-14 text-right", textColor)}>{tag}</span>
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

function SWOTQuadrant({ swot }: { swot: AIAnalysis["swot"] }) {
  const total = swot.strengthsWeight + swot.weaknessesWeight + swot.opportunitiesWeight + swot.threatsWeight;
  const sPct = (swot.strengthsWeight / total) * 100;
  const wPct = (swot.weaknessesWeight / total) * 100;
  const oPct = (swot.opportunitiesWeight / total) * 100;
  const tPct = (swot.threatsWeight / total) * 100;

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
      <div className="grid grid-cols-2 gap-1 mb-2">
        <SWOTBlock label="Strengths" weight={swot.strengthsWeight} pct={sPct} color="emerald" />
        <SWOTBlock label="Weaknesses" weight={swot.weaknessesWeight} pct={wPct} color="red" />
        <SWOTBlock label="Opportunities" weight={swot.opportunitiesWeight} pct={oPct} color="blue" />
        <SWOTBlock label="Threats" weight={swot.threatsWeight} pct={tPct} color="orange" />
      </div>
      <div className="flex items-center gap-1.5">
        {verdictIcon === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
        {verdictIcon === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
        {verdictIcon === "neutral" && <Minus className="h-3 w-3 text-amber-500" />}
        <p className="text-[10px] font-medium text-slate-600">{verdict}</p>
      </div>
    </>
  );
}

function SWOTBlock({ label, weight, pct, color }: { label: string; weight: number; pct: number; color: string }) {
  const bgColors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
  };
  const textColors: Record<string, string> = {
    emerald: "text-emerald-700",
    red: "text-red-700",
    blue: "text-blue-700",
    orange: "text-orange-700",
  };
  const barColors: Record<string, string> = {
    emerald: "bg-emerald-400",
    red: "bg-red-400",
    blue: "bg-blue-400",
    orange: "bg-orange-400",
  };

  return (
    <div className={clsx("rounded-lg px-2 py-1.5 border", bgColors[color])}>
      <div className="flex items-center justify-between mb-1">
        <span className={clsx("text-[9px] font-semibold", textColors[color])}>{label}</span>
        <span className={clsx("text-[10px] font-bold", textColors[color])}>{weight}/10</span>
      </div>
      <div className="h-1 bg-white/60 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", barColors[color])} style={{ width: `${pct * 2.5}%` }} />
      </div>
    </div>
  );
}

// ── Fallback sub-components (before AI analysis) ──

function MiniBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const width = Math.min(100, (count / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 w-4 text-right">{count}</span>
    </div>
  );
}

function ForceIndicator({ label, count }: { label: string; count: number }) {
  const intensity = count <= 1 ? "Low" : count <= 3 ? "Med" : "High";
  const dots = Math.min(3, Math.ceil(count / 2));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-20 truncate">{label}</span>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={clsx(
              "h-1.5 w-3 rounded-sm",
              i < dots
                ? dots === 3 ? "bg-red-400" : dots === 2 ? "bg-amber-400" : "bg-emerald-400"
                : "bg-slate-100"
            )}
          />
        ))}
      </div>
      <span className={clsx(
        "text-[9px] font-bold w-8",
        intensity === "High" ? "text-red-500" : intensity === "Med" ? "text-amber-500" : "text-emerald-500"
      )}>
        {intensity}
      </span>
    </div>
  );
}

function SwotCell({ label, count, color }: { label: string; count: number; color: string }) {
  const bgColors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100",
    red: "bg-red-50 border-red-100",
    blue: "bg-blue-50 border-blue-100",
    orange: "bg-orange-50 border-orange-100",
  };
  const textColors: Record<string, string> = {
    emerald: "text-emerald-700",
    red: "text-red-700",
    blue: "text-blue-700",
    orange: "text-orange-700",
  };
  return (
    <div className={clsx("rounded-lg px-2 py-1.5 border", bgColors[color])}>
      <div className="flex items-center justify-between">
        <span className={clsx("text-[9px] font-semibold", textColors[color])}>{label}</span>
        <span className={clsx("text-xs font-bold", textColors[color])}>{count}</span>
      </div>
    </div>
  );
}
