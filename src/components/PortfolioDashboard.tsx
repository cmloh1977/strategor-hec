"use client";

import { useState } from "react";
import { usePortfolio, LANGUAGE_LABELS, LANGUAGE_FLAGS, DIFFICULTY_LABELS } from "@/lib/PortfolioContext";
import type { AppLanguage, DifficultyLevel } from "@/lib/PortfolioContext";
import { ChevronRight, Lock, CheckCircle2, Circle, Loader2, Sparkles, Trash2, RefreshCw } from "lucide-react";
import clsx from "clsx";
import StrategicHealthCard from "./StrategicHealthCard";

const STEP_LABELS: Record<string, string> = {
  "business-model": "Business Model",
  "external-analysis": "External Analysis",
  "value-curve": "Value Curve",
  "internal-analysis": "Internal Analysis",
  "swot-synthesis": "SWOT Synthesis",
};

function getNextStep(a: any): string {
  if (!a.businessModel.valueProposition.populated || !a.businessModel.valueArchitecture.populated || !a.businessModel.contributions.populated) return "business-model";
  if (!a.fiveForces.newEntrants.populated || !a.fiveForces.suppliers.populated || !a.fiveForces.rivalry.populated || !a.fiveForces.buyers.populated || !a.fiveForces.substitutes.populated) return "external-analysis";
  if (!a.valueCurve?.populated) return "value-curve";
  if (!a.vrio.valuable.populated || !a.vrio.rare.populated || !a.vrio.inimitable.populated || !a.vrio.organized.populated) return "internal-analysis";
  if (!a.swot.strengths.populated || !a.swot.weaknesses.populated || !a.swot.opportunities.populated || !a.swot.threats.populated) return "swot-synthesis";
  return "innovation-directions";
}

function isStepComplete(a: any, step: string): boolean {
  if (step === "business-model") return a.businessModel.valueProposition.populated && a.businessModel.valueArchitecture.populated && a.businessModel.contributions.populated;
  if (step === "external-analysis") return a.fiveForces.newEntrants.populated && a.fiveForces.suppliers.populated && a.fiveForces.rivalry.populated && a.fiveForces.buyers.populated && a.fiveForces.substitutes.populated;
  if (step === "value-curve") return a.valueCurve?.populated ?? false;
  if (step === "internal-analysis") return a.vrio.valuable.populated && a.vrio.rare.populated && a.vrio.inimitable.populated && a.vrio.organized.populated;
  if (step === "swot-synthesis") return a.swot.strengths.populated && a.swot.weaknesses.populated && a.swot.opportunities.populated && a.swot.threats.populated;
  if (step === "innovation-directions") {
    const inn = a.innovationDirections;
    if (!inn?.confirmed) return false;
    const dds = inn.deepDives || {};
    return inn.selectedDirections?.length === 3 && inn.selectedDirections.every((d: any) => dds[d.id]?.populated);
  }
  return false;
}

interface PortfolioDashboardProps {
  onNavigate: (view: string, step?: string) => void;
}

export default function PortfolioDashboard({ onNavigate }: PortfolioDashboardProps) {
  const {
    portfolio,
    isLoading,
    startAnalysis,
    resetAnalysis,
    myAnalysisComplete,
    myAnalysisProgress,
  } = usePortfolio();
  // Setup form state
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [division, setDivision] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizDesc, setBizDesc] = useState("");
  const [chatLang, setChatLang] = useState<AppLanguage>("en");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("masters");

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleStart = () => {
    if (name.trim() && bizName.trim()) {
      startAnalysis(name.trim(), region.trim() || "N/A", division.trim() || "N/A", bizName.trim(), bizDesc.trim(), chatLang, difficulty);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Strategy Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete your business analysis, then explore Innovation Directions.
          </p>
        </div>

        {/* ─── SECTION 1: My Analysis ────────── */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">📋 My Analysis</h2>

          {!portfolio.myAnalysis ? (
            /* ── Setup Form ── */
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Define Your Business</h3>
              <p className="text-sm text-slate-500 mb-6">Tell us about yourself and the business you&apos;ll analyze.</p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Your Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kenji Tanaka"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Business / Product Line Name</label>
                <input
                  type="text" value={bizName} onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Auto Parts Logistics, Green Energy Trading..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Brief Description (optional)</label>
                <textarea
                  value={bizDesc} onChange={(e) => setBizDesc(e.target.value)}
                  placeholder="A short description of what this business does..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Thinking Partner Language</label>
                  <select
                    value={chatLang} onChange={(e) => setChatLang(e.target.value as AppLanguage)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    {(Object.keys(LANGUAGE_LABELS) as AppLanguage[]).map((k) => (
                      <option key={k} value={k}>{LANGUAGE_FLAGS[k]} {LANGUAGE_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Difficulty Level</label>
                  <select
                    value={difficulty} onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((k) => (
                      <option key={k} value={k}>{DIFFICULTY_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleStart}
disabled={!name.trim() || !bizName.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start My Analysis →
              </button>
            </div>
          ) : myAnalysisComplete ? (
            /* ── Strategic Health Card ── */
            <StrategicHealthCard analysis={portfolio.myAnalysis} shareCode={null} />
          ) : (
            /* ── In-Progress Analysis Card ── */
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-2 w-full" style={{ background: portfolio.myAnalysis.color }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{portfolio.myAnalysis.businessName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {portfolio.myAnalysis.ownerName} · {portfolio.myAnalysis.ownerRegion} · {portfolio.myAnalysis.ownerDivision || portfolio.myAnalysis.ownerRegion}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{myAnalysisProgress.done}/{myAnalysisProgress.total} pillars</span>
                    <span className="font-semibold" style={{ color: portfolio.myAnalysis.color }}>{myAnalysisProgress.percent}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${myAnalysisProgress.percent}%`, background: portfolio.myAnalysis.color }} />
                  </div>
                </div>

                {/* Step Checklist */}
                <div className="space-y-1.5 mb-5">
                  {(["business-model", "external-analysis", "value-curve", "internal-analysis", "swot-synthesis"] as const).map((step) => {
                    const done = isStepComplete(portfolio.myAnalysis!, step);
                    return (
                      <div key={step} className="flex items-center gap-2 text-xs">
                        {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                        <span className={clsx(done ? "text-slate-600" : "text-slate-400")}>{STEP_LABELS[step]}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => onNavigate("analysis", getNextStep(portfolio.myAnalysis!))}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: portfolio.myAnalysis.color }}
                >
                  Continue Analysis <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Reset / Start Over */}
          {portfolio.myAnalysis && (
            <div className="mt-3">
              {showResetConfirm ? (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800 font-medium mb-1">Delete this analysis?</p>
                  <p className="text-xs text-red-600 mb-3">This will permanently erase all your progress, populated data, and chat history. You'll start fresh with a new language and difficulty selection.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetAnalysis(); setShowResetConfirm(false); }}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                    >
                      Yes, Delete Everything
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Start Over with New Analysis
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
