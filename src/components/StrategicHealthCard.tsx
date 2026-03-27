"use client";

import { CheckCircle2, Shield, Swords, Target, TrendingUp, TrendingDown, AlertTriangle, Zap, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import clsx from "clsx";
import type { MyAnalysis } from "@/lib/PortfolioContext";

interface StrategicHealthCardProps {
  analysis: MyAnalysis;
  shareCode: string | null;
}

// ── Derive strategic insights ──
function deriveInsights(a: MyAnalysis) {
  // 1. Business Model depth (points count)
  const bmPoints = [
    ...a.businessModel.valueProposition.points,
    ...a.businessModel.valueArchitecture.points,
    ...a.businessModel.contributions.points,
  ];
  const bmDepth = bmPoints.length;
  const bmScore = Math.min(5, Math.round(bmDepth / 2)); // 0-5 scale

  // 2. Competitive Pressure (5 Forces — more points = higher pressure)
  const forcePointCounts = {
    newEntrants: a.fiveForces.newEntrants.points.length,
    suppliers: a.fiveForces.suppliers.points.length,
    rivalry: a.fiveForces.rivalry.points.length,
    buyers: a.fiveForces.buyers.points.length,
    substitutes: a.fiveForces.substitutes.points.length,
  };
  const totalForcePoints = Object.values(forcePointCounts).reduce((s, v) => s + v, 0);
  const competitivePressure = Math.min(5, Math.round(totalForcePoints / 3)); // 0-5 scale

  // 3. VRIO — Competitive Advantage Level
  const vrioMet = {
    valuable: a.vrio.valuable.populated,
    rare: a.vrio.rare.populated,
    inimitable: a.vrio.inimitable.populated,
    organized: a.vrio.organized.populated,
  };
  const vrioCount = Object.values(vrioMet).filter(Boolean).length;
  let vrioLevel: string;
  let vrioColor: string;
  if (vrioCount === 4) { vrioLevel = "Sustained Competitive Advantage"; vrioColor = "emerald"; }
  else if (vrioCount === 3) { vrioLevel = "Unused Competitive Advantage"; vrioColor = "amber"; }
  else if (vrioCount === 2) { vrioLevel = "Temporary Competitive Advantage"; vrioColor = "orange"; }
  else if (vrioCount === 1) { vrioLevel = "Competitive Parity"; vrioColor = "slate"; }
  else { vrioLevel = "Competitive Disadvantage"; vrioColor = "red"; }

  // 4. SWOT Balance
  const strengthCount = a.swot.strengths.points.length;
  const weaknessCount = a.swot.weaknesses.points.length;
  const oppCount = a.swot.opportunities.points.length;
  const threatCount = a.swot.threats.points.length;

  const positiveTotal = strengthCount + oppCount;
  const negativeTotal = weaknessCount + threatCount;
  const swotBalance = positiveTotal - negativeTotal; // positive = good

  let swotVerdict: string;
  let swotIcon: "up" | "down" | "neutral";
  if (swotBalance > 2) { swotVerdict = "Strong strategic position"; swotIcon = "up"; }
  else if (swotBalance > 0) { swotVerdict = "Favorable with caution areas"; swotIcon = "up"; }
  else if (swotBalance === 0) { swotVerdict = "Balanced — needs clear strategy"; swotIcon = "neutral"; }
  else if (swotBalance > -2) { swotVerdict = "Vulnerable — act on strengths"; swotIcon = "down"; }
  else { swotVerdict = "High risk — defensive strategy needed"; swotIcon = "down"; }

  // Overall Health Score (0-100)
  const healthScore = Math.min(100, Math.round(
    (bmScore / 5 * 25) + // Business model clarity: 25%
    ((5 - competitivePressure) / 5 * 20) + // Low competitive pressure: 20%
    (vrioCount / 4 * 30) + // VRIO strength: 30%
    (Math.max(0, Math.min(5, swotBalance + 3)) / 6 * 25) // SWOT balance: 25%
  ));

  let healthGrade: string;
  let healthColor: string;
  if (healthScore >= 80) { healthGrade = "A"; healthColor = "#10b981"; }
  else if (healthScore >= 65) { healthGrade = "B"; healthColor = "#3b82f6"; }
  else if (healthScore >= 50) { healthGrade = "C"; healthColor = "#f59e0b"; }
  else if (healthScore >= 35) { healthGrade = "D"; healthColor = "#f97316"; }
  else { healthGrade = "F"; healthColor = "#ef4444"; }

  return {
    bmDepth, bmScore, bmPoints,
    forcePointCounts, competitivePressure, totalForcePoints,
    vrioMet, vrioCount, vrioLevel, vrioColor,
    strengthCount, weaknessCount, oppCount, threatCount,
    positiveTotal, negativeTotal, swotBalance, swotVerdict, swotIcon,
    healthScore, healthGrade, healthColor,
  };
}

export default function StrategicHealthCard({ analysis, shareCode }: StrategicHealthCardProps) {
  const ins = deriveInsights(analysis);

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
              style={{ backgroundColor: ins.healthColor + "22", border: `2px solid ${ins.healthColor}`, color: ins.healthColor }}
            >
              {ins.healthGrade}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{ins.healthScore}/100</p>
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
          <div className="space-y-1.5">
            <MiniBar label="Value Proposition" count={analysis.businessModel.valueProposition.points.length} max={5} color="#3b82f6" />
            <MiniBar label="Value Architecture" count={analysis.businessModel.valueArchitecture.points.length} max={5} color="#3b82f6" />
            <MiniBar label="Contributions" count={analysis.businessModel.contributions.points.length} max={5} color="#3b82f6" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">{ins.bmDepth} key elements defined</p>
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
          <div className="space-y-1.5">
            <ForceIndicator label="New Entrants" count={ins.forcePointCounts.newEntrants} />
            <ForceIndicator label="Suppliers" count={ins.forcePointCounts.suppliers} />
            <ForceIndicator label="Rivalry" count={ins.forcePointCounts.rivalry} />
            <ForceIndicator label="Buyers" count={ins.forcePointCounts.buyers} />
            <ForceIndicator label="Substitutes" count={ins.forcePointCounts.substitutes} />
          </div>
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
          <div className="flex items-center gap-1 mb-2">
            {(["valuable", "rare", "inimitable", "organized"] as const).map((k) => (
              <div
                key={k}
                className={clsx(
                  "flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-wider",
                  ins.vrioMet[k]
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
            ins.vrioCount === 4 && "bg-emerald-50 text-emerald-700",
            ins.vrioCount === 3 && "bg-amber-50 text-amber-700",
            ins.vrioCount === 2 && "bg-orange-50 text-orange-700",
            ins.vrioCount <= 1 && "bg-slate-50 text-slate-500",
          )}>
            {ins.vrioLevel}
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
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <SwotCell label="Strengths" count={ins.strengthCount} color="emerald" icon="+" />
            <SwotCell label="Weaknesses" count={ins.weaknessCount} color="red" icon="-" />
            <SwotCell label="Opportunities" count={ins.oppCount} color="blue" icon="+" />
            <SwotCell label="Threats" count={ins.threatCount} color="orange" icon="-" />
          </div>
          <div className="flex items-center gap-1.5">
            {ins.swotIcon === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
            {ins.swotIcon === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            {ins.swotIcon === "neutral" && <Minus className="h-3 w-3 text-amber-500" />}
            <p className="text-[10px] font-medium text-slate-600">{ins.swotVerdict}</p>
          </div>
        </div>
      </div>

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

function SwotCell({ label, count, color, icon }: { label: string; count: number; color: string; icon: "+" | "-" }) {
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
