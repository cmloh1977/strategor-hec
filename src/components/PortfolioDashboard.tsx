"use client";

import { useState } from "react";
import { usePortfolio, LANGUAGE_LABELS, LANGUAGE_FLAGS, DIFFICULTY_LABELS } from "@/lib/PortfolioContext";
import type { AppLanguage, DifficultyLevel, HealthCard } from "@/lib/PortfolioContext";
import { useTeam } from "@/lib/TeamContext";
import { REGIONS, getDivisionsForRegion } from "@/lib/regionDivisions";
import { ChevronRight, Lock, CheckCircle2, Circle, Loader2, Copy, Check, UserPlus, X, Users, Sparkles, Trash2, RefreshCw } from "lucide-react";
import clsx from "clsx";
import StrategicHealthCard from "./StrategicHealthCard";

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
    resetAnalysis,
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
  const [division, setDivision] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizDesc, setBizDesc] = useState("");
  const [chatLang, setChatLang] = useState<AppLanguage>("en");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("masters");

  // Share code UI
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

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
    if (name.trim() && region.trim() && division.trim() && bizName.trim()) {
      startAnalysis(name.trim(), region.trim(), division.trim(), bizName.trim(), bizDesc.trim(), chatLang, difficulty);
    }
  };

  const handleGenerateCode = async (force: boolean = false) => {
    setGenerating(true);
    await generateShareCode(force);
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Your Region</label>
                  <select
                    value={region}
                    onChange={(e) => { setRegion(e.target.value); setDivision(""); }}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">Select region...</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {region === "Africa" ? "CFAO Business Line" : "Your Division"}
                </label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  disabled={!region}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{region ? (region === "Africa" ? "Select CFAO business line..." : "Select division...") : "Pick a region first..."}</option>
                  {region && getDivisionsForRegion(region).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
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
disabled={!name.trim() || !region.trim() || !bizName.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start My Analysis →
              </button>
            </div>
          ) : myAnalysisComplete ? (
            /* ── Strategic Health Card ── */
            <div className="space-y-4">
              <StrategicHealthCard analysis={portfolio.myAnalysis} shareCode={shareCode} />
              
              {/* Share Code Section */}
              {shareCode ? (
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
                    <button
                      onClick={() => handleGenerateCode(true)}
                      disabled={generating}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      title="Regenerate this code to capture your latest AI scores"
                    >
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Update Data
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-2">Share this code with your team members. Click "Update Data" if you've recently modified your analysis.</p>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateCode()}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 shadow-md"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Share Code
                </button>
              )}
            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teamCards.map((card) => {
                const ai = card.aiAnalysis;
                let healthScore = 0;
                let grade = "F", gradeColor = "#ef4444";
                let vrioElement = null;
                let swotElement = null;
                let marketElement = null;

                if (ai) {
                  healthScore = ai.healthScore;
                  if (healthScore >= 80) { grade = "A"; gradeColor = "#10b981"; }
                  else if (healthScore >= 65) { grade = "B"; gradeColor = "#3b82f6"; }
                  else if (healthScore >= 50) { grade = "C"; gradeColor = "#f59e0b"; }
                  else if (healthScore >= 35) { grade = "D"; gradeColor = "#f97316"; }
                  else { grade = "F"; gradeColor = "#ef4444"; }

                  // VRIO Competitive Advantage
                  const adv = ai.vrio.competitiveAdvantage.toLowerCase();
                  let advColor = "bg-slate-100 text-slate-600 border-slate-200";
                  let advIcon = "—";
                  let displayAdv = ai.vrio.competitiveAdvantage;
                  
                  if (adv.includes("sustained")) { advColor = "bg-emerald-100 text-emerald-700 border-emerald-200"; advIcon = "🏆"; displayAdv = "Sustained Advantage"; }
                  else if (adv.includes("temporary")) { advColor = "bg-blue-100 text-blue-700 border-blue-200"; advIcon = "⏳"; displayAdv = "Temporary Advantage"; }
                  else if (adv.includes("parity")) { advColor = "bg-amber-100 text-amber-700 border-amber-200"; advIcon = "⚖️"; displayAdv = "Competitive Parity"; }
                  else if (adv.includes("disadvantage")) { advColor = "bg-red-100 text-red-700 border-red-200"; advIcon = "🔻"; displayAdv = "Competitive Disadvantage"; }

                  vrioElement = (
                    <div className={clsx("rounded border px-2 py-0.5 text-[9px] font-bold truncate w-[90%] mx-auto flex items-center justify-center gap-1 mb-1", advColor)} title={displayAdv}>
                      <span>{advIcon}</span>
                      <span className="truncate">{displayAdv}</span>
                    </div>
                  );

                  // 5F Market Attractiveness
                  const att = ai.fiveForces.overallAttractiveness.toLowerCase();
                  let attColor = "text-slate-500";
                  let attIcon = "■";
                  if (att.includes("high")) { attColor = "text-emerald-500"; attIcon = "📈"; }
                  else if (att.includes("moderate")) { attColor = "text-amber-500"; attIcon = "⚖️"; }
                  else if (att.includes("low")) { attColor = "text-red-500"; attIcon = "📉"; }

                  marketElement = (
                    <span className={clsx("text-[9px] font-bold mb-1 w-full truncate text-center", attColor)}>
                      {attIcon} {ai.fiveForces.overallAttractiveness} Attractiveness
                    </span>
                  );

                  // Priority
                  const topPriority = ai.priorities?.[0]?.text || "No priority specified";
                  swotElement = (
                     <div className="text-[9px] text-slate-500 w-full text-center px-3 line-clamp-2 italic leading-tight" title={topPriority}>
                       "{topPriority}"
                     </div>
                  );
                } else {
                  // Fallback for legacy lack of AI
                  const vrioMet = [card.vrio.valuable, card.vrio.rare, card.vrio.inimitable, card.vrio.organized].filter(v => v?.populated).length;
                  const sCount = card.swot.strengths.points.length;
                  const wCount = card.swot.weaknesses.points.length;
                  const oCount = card.swot.opportunities.points.length;
                  const tCount = card.swot.threats.points.length;
                  const forceTotal = [card.fiveForces.newEntrants, card.fiveForces.suppliers, card.fiveForces.rivalry, card.fiveForces.buyers, card.fiveForces.substitutes]
                    .reduce((s, f) => s + (f?.points?.length || 0), 0);
                  const pressure = forceTotal <= 5 ? "Low" : forceTotal <= 10 ? "Med" : "High";
                  const pressureColor = pressure === "High" ? "text-red-500" : pressure === "Med" ? "text-amber-500" : "text-emerald-500";
  
                  const bmDepth = [card.businessModel.valueProposition, card.businessModel.valueArchitecture, card.businessModel.contributions]
                    .reduce((s, p) => s + (p?.points?.length || 0), 0);
                  const bmScore = Math.min(5, Math.round(bmDepth / 2));
                  const swotBalance = (sCount + oCount) - (wCount + tCount);
                  healthScore = Math.min(100, Math.round(
                    (bmScore / 5 * 25) + ((5 - Math.min(5, Math.round(forceTotal / 3))) / 5 * 20) + (vrioMet / 4 * 30) + (Math.max(0, Math.min(5, swotBalance + 3)) / 6 * 25)
                  ));
                  
                  if (healthScore >= 80) { grade = "A"; gradeColor = "#10b981"; }
                  else if (healthScore >= 65) { grade = "B"; gradeColor = "#3b82f6"; }
                  else if (healthScore >= 50) { grade = "C"; gradeColor = "#f59e0b"; }
                  else if (healthScore >= 35) { grade = "D"; gradeColor = "#f97316"; }
                  else { grade = "F"; gradeColor = "#ef4444"; }

                  vrioElement = (
                      <div className="flex items-center justify-center gap-0.5 mb-1.5 w-full">
                        {["V","R","I","O"].map((l, i) => (
                          <div key={l} className={clsx(
                            "h-4 w-4 rounded text-[8px] font-bold flex items-center justify-center",
                            i < vrioMet ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300"
                          )}>{l}</div>
                        ))}
                      </div>
                  );

                  swotElement = (
                      <div className="flex items-center justify-center gap-1 text-[9px] mb-1 w-full">
                        <span className="text-emerald-600 font-bold">{sCount}S</span>
                        <span className="text-red-400 font-bold">{wCount}W</span>
                        <span className="text-blue-500 font-bold">{oCount}O</span>
                        <span className="text-orange-400 font-bold">{tCount}T</span>
                      </div>
                  );

                  marketElement = (
                      <span className={clsx("text-[9px] font-bold truncate w-full text-center mb-1", pressureColor)}>
                        {pressure === "High" ? "⬆" : pressure === "Med" ? "■" : "⬇"} {pressure} pressure
                      </span>
                  );
                }

                return (
                  <div key={card.shareCode} className="aspect-square rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
                    <div className="h-1.5 w-full flex-shrink-0" style={{ background: card.color }} />
                    <div className="flex-1 flex flex-col items-center justify-center py-3 text-center relative">
                      {/* Remove button */}
                      <button
                        onClick={() => removeTeamCard(card.shareCode)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all z-10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Grade badge */}
                      <div className="relative mb-2">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black"
                          style={{ backgroundColor: gradeColor + "18", border: `2px solid ${gradeColor}`, color: gradeColor }}
                        >
                          {grade}
                        </div>
                        {ai && (
                          <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200" title="Grade based on AI Health Score">
                            <Sparkles className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Business name */}
                      <h4 className="font-bold text-xs text-slate-900 leading-tight truncate w-full px-2" title={card.businessName}>{card.businessName}</h4>
                      <p className="text-[10px] text-slate-400 truncate w-full mb-2 px-2" title={card.ownerName}>{card.ownerName}</p>

                      {vrioElement}
                      {marketElement}
                      {swotElement}
                    </div>
                    {/* Footer */}
                    <div className="px-3 py-1.5 border-t border-slate-50 text-center flex-shrink-0">
                      <span className="font-mono text-[9px] text-slate-300">{card.shareCode}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Team Constellation Section ────────── */}
        <TeamSection onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ── Team Section Component ──
function TeamSection({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { team, isInTeam, isLeader, createTeam, joinTeam, leaveTeam } = useTeam();
  const { constellationCards, myAnalysisComplete, teamCards } = usePortfolio();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Build own card for team creation/joining
  const ownCard = constellationCards.length > 0 ? constellationCards[0] : null;

  const handleCreate = async () => {
    if (!teamName.trim() || !ownCard) return;
    setLoading(true);
    setError(null);
    // Pass imported team cards so they're included in the team from the start
    const code = await createTeam(teamName.trim(), ownCard, teamCards);
    if (!code) setError("Failed to create team");
    setLoading(false);
    setShowCreateForm(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !ownCard) return;
    setLoading(true);
    setError(null);
    const result = await joinTeam(joinCode.trim(), ownCard);
    if (!result.success) setError(result.error || "Failed to join");
    setLoading(false);
    setShowJoinForm(false);
  };

  const copyCode = () => {
    if (team?.joinCode) {
      navigator.clipboard.writeText(team.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Already in a team ──
  if (isInTeam && team) {
    return (
      <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-white/90" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">{team.teamName}</h3>
              <p className="text-sm text-white/80 mt-0.5">
                {team.memberCards.length} member{team.memberCards.length !== 1 ? "s" : ""} · 
                {isLeader ? " You are the leader" : ` Led by ${team.leaderName}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (confirm("Leave this team? You can rejoin or create a new one.")) leaveTeam(); }}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white/80 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                Leave
              </button>
              <button
                onClick={() => onNavigate("constellation")}
                className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
              >
                Open Constellation →
              </button>
            </div>
          </div>

          {/* Team Code + Members */}
          <div className="mt-4 flex gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Team Code</p>
                <p className="font-mono font-bold text-lg tracking-wider">{team.joinCode}</p>
              </div>
              <button onClick={copyCode} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2.5 flex-1">
              <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Members</p>
              <div className="flex flex-wrap gap-1.5">
                {team.memberCards.map((c: HealthCard) => (
                  <span key={c.shareCode || c.ownerName} className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">
                    {c.ownerName} <span className="text-white/50">({c.businessName})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not in a team yet ──
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Team Constellation</h3>
            <p className="text-sm text-slate-500">Create or join a team to unlock cross-divisional analysis</p>
          </div>
        </div>

        {!myAnalysisComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-700">⚠️ Complete your individual analysis first to create or join a team.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-red-700">❌ {error}</p>
          </div>
        )}

        {/* Create / Join Buttons */}
        {!showCreateForm && !showJoinForm && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              disabled={!myAnalysisComplete}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Create Team
            </button>
            <button
              onClick={() => setShowJoinForm(true)}
              disabled={!myAnalysisComplete}
              className="flex-1 py-3 rounded-xl border-2 border-indigo-200 text-indigo-700 font-semibold text-sm hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Join Team
            </button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="space-y-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name (e.g. HEC Team Alpha)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={loading || !teamName.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Team"}
              </button>
              <button onClick={() => setShowCreateForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Join Form */}
        {showJoinForm && (
          <div className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter team code (e.g. TM-A7K3)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleJoin} disabled={loading || !joinCode.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Join Team"}
              </button>
              <button onClick={() => setShowJoinForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
