"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/PortfolioContext";
import { ChevronRight, Lock, CheckCircle2, Circle, Loader2, Copy, Check, UserPlus, X, Users, Sparkles } from "lucide-react";
import clsx from "clsx";

const STEP_LABELS: Record<string, string> = {
  "business-model": "Business Model",
  "external-analysis": "External Analysis",
  "internal-analysis": "Internal Analysis",
  "swot-synthesis": "SWOT Synthesis",
};

function getNextStep(a: any): string {
  if (!a.businessModel.valueProposition.populated || !a.businessModel.valueArchitecture.populated || !a.businessModel.contributions.populated) return "business-model";
  if (!a.fiveForces.newEntrants.populated || !a.fiveForces.suppliers.populated || !a.fiveForces.rivalry.populated || !a.fiveForces.buyers.populated || !a.fiveForces.substitutes.populated) return "external-analysis";
  if (!a.vrio.valuable.populated || !a.vrio.rare.populated || !a.vrio.inimitable.populated || !a.vrio.organized.populated) return "internal-analysis";
  return "swot-synthesis";
}

function isStepComplete(a: any, step: string): boolean {
  if (step === "business-model") return a.businessModel.valueProposition.populated && a.businessModel.valueArchitecture.populated && a.businessModel.contributions.populated;
  if (step === "external-analysis") return a.fiveForces.newEntrants.populated && a.fiveForces.suppliers.populated && a.fiveForces.rivalry.populated && a.fiveForces.buyers.populated && a.fiveForces.substitutes.populated;
  if (step === "internal-analysis") return a.vrio.valuable.populated && a.vrio.rare.populated && a.vrio.inimitable.populated && a.vrio.organized.populated;
  if (step === "swot-synthesis") return a.swot.strengths.populated && a.swot.weaknesses.populated && a.swot.opportunities.populated && a.swot.threats.populated;
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
    myAnalysisComplete,
    myAnalysisProgress,
    generateShareCode,
    shareCode,
    importShareCode,
    removeTeamCard,
    teamCards,
    phase2Unlocked,
    constellationCards,
  } = usePortfolio();

  // Setup form state
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizDesc, setBizDesc] = useState("");

  // Share code UI
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  const handleStart = () => {
    if (name.trim() && region.trim() && bizName.trim()) {
      startAnalysis(name.trim(), region.trim(), bizName.trim(), bizDesc.trim());
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    await generateShareCode();
    setGenerating(false);
  };

  const handleCopy = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImport = async () => {
    if (!importCode.trim()) return;
    setImportLoading(true);
    setImportError("");
    const result = await importShareCode(importCode.trim());
    setImportLoading(false);
    if (result.success) {
      setImportCode("");
      setShowImport(false);
    } else {
      setImportError(result.error || "Import failed");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Strategy Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete your business analysis, then share your Health Card with your team.
          </p>
        </div>

        {/* ─── SECTION 1: My Analysis ────────── */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">📋 My Analysis</h2>

          {!portfolio.myAnalysis ? (
            /* ── Setup Form ── */
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Define Your Business</h3>
              <p className="text-sm text-slate-500 mb-6">Tell us about yourself and the business you'll analyze.</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Your Name</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kenji Tanaka"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Your Region / Division</label>
                  <input
                    type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Africa Division, Japan HQ..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Business / Product Line Name</label>
                <input
                  type="text" value={bizName} onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Auto Parts Logistics, Green Energy Trading..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-600 mb-1">Brief Description (optional)</label>
                <textarea
                  value={bizDesc} onChange={(e) => setBizDesc(e.target.value)}
                  placeholder="A short description of what this business does..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none resize-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  rows={2}
                />
              </div>

              <button
                onClick={handleStart}
                disabled={!name.trim() || !region.trim() || !bizName.trim()}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start My Analysis →
              </button>
            </div>
          ) : (
            /* ── Analysis Card ── */
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-2 w-full" style={{ background: portfolio.myAnalysis.color }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{portfolio.myAnalysis.businessName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {portfolio.myAnalysis.ownerName} · {portfolio.myAnalysis.ownerRegion}
                    </p>
                  </div>
                  {myAnalysisComplete && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Complete</span>
                    </div>
                  )}
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
                  {(["business-model", "external-analysis", "internal-analysis", "swot-synthesis"] as const).map((step) => {
                    const done = isStepComplete(portfolio.myAnalysis!, step);
                    return (
                      <div key={step} className="flex items-center gap-2 text-xs">
                        {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300" />}
                        <span className={clsx(done ? "text-slate-600" : "text-slate-400")}>{STEP_LABELS[step]}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Action: Continue or Share Code */}
                {!myAnalysisComplete ? (
                  <button
                    onClick={() => onNavigate("analysis", getNextStep(portfolio.myAnalysis!))}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: portfolio.myAnalysis.color }}
                  >
                    Continue Analysis <ChevronRight className="h-4 w-4" />
                  </button>
                ) : shareCode ? (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs text-emerald-700 font-semibold mb-2">🎉 Your Share Code</p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl font-bold text-emerald-800 tracking-widest">{shareCode}</span>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-2">Share this code with your team members so they can import your Health Card.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateCode}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 shadow-md"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate Share Code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION 2: Team Constellation ────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">👥 Team Constellation</h2>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Import Team Member
            </button>
          </div>

          {/* Import Modal */}
          {showImport && (
            <div className="mb-4 rounded-xl bg-white border border-indigo-200 shadow-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 text-sm">Enter Share Code</h4>
                <button onClick={() => { setShowImport(false); setImportError(""); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={importCode}
                  onChange={(e) => { setImportCode(e.target.value.toUpperCase()); setImportError(""); }}
                  placeholder="e.g. TT-7K3M"
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono tracking-wider outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 uppercase"
                  maxLength={7}
                  onKeyDown={(e) => { if (e.key === "Enter") handleImport(); }}
                />
                <button
                  onClick={handleImport}
                  disabled={importLoading || !importCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
                </button>
              </div>
              {importError && (
                <p className="text-xs text-red-600 mt-2">{importError}</p>
              )}
            </div>
          )}

          {/* Imported Cards Grid */}
          {teamCards.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No team members imported yet.</p>
              <p className="text-xs text-slate-400 mt-1">Ask your team members for their Share Codes after they complete their analysis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamCards.map((card) => (
                <div key={card.shareCode} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden group">
                  <div className="h-2 w-full" style={{ background: card.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{card.businessName}</h4>
                        <p className="text-[11px] text-slate-500">{card.ownerName} · {card.ownerRegion}</p>
                      </div>
                      <button
                        onClick={() => removeTeamCard(card.shareCode)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{card.shareCode}</span>
                      <span>✓ Complete</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Phase 2 Unlock Banner ────────── */}
        <div className={clsx(
          "rounded-2xl p-6 transition-all duration-500",
          phase2Unlocked
            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl"
            : "bg-slate-100 border border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            {phase2Unlocked ? (
              <Sparkles className="h-8 w-8 text-white/90" />
            ) : (
              <Lock className="h-8 w-8 text-slate-400" />
            )}
            <div className="flex-1">
              <h3 className={clsx("font-bold text-lg", phase2Unlocked ? "text-white" : "text-slate-600")}>
                Team Constellation View
              </h3>
              <p className={clsx("text-sm mt-1", phase2Unlocked ? "text-white/80" : "text-slate-400")}>
                {phase2Unlocked
                  ? `${constellationCards.length} Health Cards assembled. Discover cross-divisional patterns!`
                  : `Need ${Math.max(0, 3 - constellationCards.length)} more Health Card${3 - constellationCards.length === 1 ? "" : "s"} to unlock. (${constellationCards.length}/3)`}
              </p>
            </div>
            {phase2Unlocked && (
              <button
                onClick={() => onNavigate("constellation")}
                className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
              >
                Explore Constellation →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
