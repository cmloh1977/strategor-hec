"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePortfolio } from "@/lib/PortfolioContext";
import type { InnovationDirection, InnovationDeepDive } from "@/lib/PortfolioContext";
import clsx from "clsx";
import {
  Compass,
  Check,
  Lock,
  Unlock,
  ChevronRight,
  Lightbulb,
  Target,
  Rocket,
  ArrowRight,
} from "lucide-react";

// ── The 14 Directions ──
const DIRECTIONS = [
  // Value Proposition (7)
  { id: 1, name: "Reduce customer overall costs", pillar: "Value Proposition", icon: "💰", desc: "Strip down, go freemium, or reduce non-price costs." },
  { id: 2, name: "Reduce customer hassles", pillar: "Value Proposition", icon: "✨", desc: "Simplify usage, eliminate friction, offer convenience." },
  { id: 3, name: "Find non-customers", pillar: "Value Proposition", icon: "🔍", desc: "Reach people who don't use your product or any alternative." },
  { id: 4, name: "Add functionality or emotion", pillar: "Value Proposition", icon: "💡", desc: "Enrich a functional product with emotion, or vice versa." },
  { id: 5, name: "Explore other segments or industries", pillar: "Value Proposition", icon: "🌍", desc: "Apply your solution to adjacent markets or industries." },
  { id: 6, name: "Introduce other stakeholders", pillar: "Value Proposition", icon: "🤝", desc: "Bring in third parties who benefit from your customer base." },
  { id: 7, name: "Modify the revenue stream", pillar: "Value Proposition", icon: "💸", desc: "Shift from one-time sales to subscriptions, performance contracts, etc." },
  // Value Architecture (7)
  { id: 8, name: "Introduce a technology", pillar: "Value Architecture", icon: "⚙️", desc: "Leverage a new technology to transform your value chain." },
  { id: 9, name: "Modify steps in the value chain", pillar: "Value Architecture", icon: "🔄", desc: "Redesign one or several steps in how you create and deliver value." },
  { id: 10, name: "Eliminate or add value chain steps", pillar: "Value Architecture", icon: "✂️", desc: "Remove intermediaries or add new steps for differentiation." },
  { id: 11, name: "Identify new inputs", pillar: "Value Architecture", icon: "🌱", desc: "Source materials, data, or resources from new places." },
  { id: 12, name: "Associate with competitors, customers, or suppliers", pillar: "Value Architecture", icon: "🔗", desc: "Form unexpected alliances to create or capture value." },
  { id: 13, name: "Identify complementors", pillar: "Value Architecture", icon: "🧩", desc: "Find products/services that enhance yours." },
  { id: 14, name: "Leverage strategic resources", pillar: "Value Architecture", icon: "🏆", desc: "Deploy existing strengths into new applications." },
] as const;

type DirectionEntry = (typeof DIRECTIONS)[number];

// ── Props ──
interface InnovationDirectionsPaneProps {
  lang: string; // 'en' | 'ja' | 'fr' | 'zh'
}

// ── Deep Dive field config ──
const DEEP_DIVE_FIELDS: { key: keyof Omit<InnovationDeepDive, "populated">; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { key: "idea", label: "The Innovation Idea", icon: <Lightbulb className="w-4 h-4" />, placeholder: "A concise description of the innovation idea…" },
  { key: "newValueProposition", label: "New Value Proposition", icon: <Target className="w-4 h-4" />, placeholder: "How does this change who you serve or what you offer?" },
  { key: "newValueArchitecture", label: "New Value Architecture", icon: <Compass className="w-4 h-4" />, placeholder: "How does this change how you create and deliver value?" },
  { key: "expectedContributions", label: "Expected Contributions", icon: <Rocket className="w-4 h-4" />, placeholder: "Financial, environmental, and societal contributions…" },
  { key: "keyBarriers", label: "Key Barriers", icon: <Lock className="w-4 h-4" />, placeholder: "Obstacles and risks to implementing this direction…" },
  { key: "firstStep", label: "First Step", icon: <ArrowRight className="w-4 h-4" />, placeholder: "The very first action to test or validate this idea…" },
];

// ── Direction Card ──
function DirectionCard({
  direction,
  isSelected,
  selectionIndex,
  justification,
  canSelect,
  onToggle,
  onJustificationChange,
  disabled,
}: {
  direction: DirectionEntry;
  isSelected: boolean;
  selectionIndex: number;
  justification: string;
  canSelect: boolean;
  onToggle: () => void;
  onJustificationChange: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || (!isSelected && !canSelect)}
        className={clsx(
          "relative rounded-xl p-4 text-left transition-all duration-300 border-2 group",
          "hover:shadow-lg hover:-translate-y-0.5",
          isSelected
            ? "border-indigo-500 bg-indigo-50/80 shadow-md shadow-indigo-100 ring-1 ring-indigo-200"
            : "border-slate-200 bg-white hover:border-slate-300",
          disabled && "opacity-60 cursor-not-allowed",
          !isSelected && !canSelect && !disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Selection badge */}
        {isSelected && (
          <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 ring-2 ring-white">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Card content */}
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{direction.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
              )}>
                #{direction.id}
              </span>
            </div>
            <h4 className={clsx(
              "text-sm font-semibold leading-snug mb-1",
              isSelected ? "text-indigo-900" : "text-slate-800"
            )}>
              {direction.name}
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {direction.desc}
            </p>
          </div>
        </div>
      </button>

      {/* Justification textarea — slides open when selected */}
      <div
        className={clsx(
          "overflow-hidden transition-all duration-400 ease-in-out",
          isSelected ? "max-h-48 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        )}
      >
        <textarea
          value={justification}
          onChange={(e) => onJustificationChange(e.target.value)}
          disabled={disabled}
          placeholder="Why is this direction relevant for your business?"
          rows={3}
          className={clsx(
            "w-full rounded-lg border border-indigo-200 bg-white p-3 text-sm text-slate-700",
            "placeholder:text-slate-400 placeholder:text-xs",
            "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent",
            "resize-none transition-colors",
            disabled && "bg-slate-50 cursor-not-allowed"
          )}
        />
        {justification.length > 0 && justification.length < 20 && (
          <p className="text-[10px] text-amber-600 mt-1 pl-1">
            Minimum 20 characters ({justification.length}/20)
          </p>
        )}
      </div>
    </div>
  );
}

// ── Pillar Section ──
function PillarSection({
  pillarName,
  directions,
  selectedIds,
  justifications,
  canSelectMore,
  onToggle,
  onJustificationChange,
  disabled,
  pillarIcon,
  pillarGradient,
}: {
  pillarName: string;
  directions: DirectionEntry[];
  selectedIds: Set<number>;
  justifications: Record<number, string>;
  canSelectMore: boolean;
  onToggle: (id: number) => void;
  onJustificationChange: (id: number, val: string) => void;
  disabled: boolean;
  pillarIcon: string;
  pillarGradient: string;
}) {
  return (
    <div className="mb-6">
      {/* Pillar header */}
      <div className={clsx(
        "flex items-center gap-3 mb-4 px-4 py-3 rounded-xl",
        pillarGradient
      )}>
        <span className="text-xl">{pillarIcon}</span>
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">{pillarName}</h3>
          <p className="text-[10px] text-white/70">7 directions to explore</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {directions.map((dir) => {
          const isSelected = selectedIds.has(dir.id);
          const idx = [...selectedIds].indexOf(dir.id);
          return (
            <DirectionCard
              key={dir.id}
              direction={dir}
              isSelected={isSelected}
              selectionIndex={idx}
              justification={justifications[dir.id] || ""}
              canSelect={canSelectMore || isSelected}
              onToggle={() => onToggle(dir.id)}
              onJustificationChange={(val) => onJustificationChange(dir.id, val)}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Deep Dive Tab ──
function DeepDiveTab({
  direction,
  deepDive,
}: {
  direction: DirectionEntry;
  deepDive: InnovationDeepDive | undefined;
}) {
  const populated = deepDive?.populated ?? false;
  const filledCount = DEEP_DIVE_FIELDS.filter(
    (f) => deepDive && deepDive[f.key] && (deepDive[f.key] as string).length > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Direction header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
        <span className="text-3xl">{direction.icon}</span>
        <div>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">
            Direction #{direction.id} · {direction.pillar}
          </p>
          <h3 className="text-base font-bold text-slate-800">{direction.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{direction.desc}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {DEEP_DIVE_FIELDS.map((field) => {
          const value = deepDive?.[field.key] as string | undefined;
          const hasContent = value && value.length > 0;

          return (
            <div
              key={field.key}
              className={clsx(
                "rounded-xl border p-4 transition-all duration-300",
                hasContent
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-slate-50/50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx(
                  "p-1.5 rounded-lg",
                  hasContent ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  {field.icon}
                </span>
                <h4 className={clsx(
                  "text-sm font-semibold",
                  hasContent ? "text-emerald-800" : "text-slate-600"
                )}>
                  {field.label}
                </h4>
                {hasContent && (
                  <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                )}
              </div>
              {hasContent ? (
                <p className="text-sm text-slate-700 leading-relaxed pl-9">
                  {value}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic pl-9">
                  {field.placeholder}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress footer */}
      <div className="flex items-center gap-2 pt-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${(filledCount / DEEP_DIVE_FIELDS.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-slate-500">
          {filledCount}/{DEEP_DIVE_FIELDS.length} fields
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Main Component ──
// ══════════════════════════════════════════════
export default function InnovationDirectionsPane({ lang }: InnovationDirectionsPaneProps) {
  const {
    portfolio,
    updateInnovationSelections,
    confirmInnovationSelections,
  } = usePortfolio();

  const innovationState = portfolio.myAnalysis?.innovationDirections;
  const confirmed = innovationState?.confirmed ?? false;
  const savedSelections = innovationState?.selectedDirections ?? [];
  const deepDives = innovationState?.deepDives ?? {};

  // ── Level Tabs ──
  const [activeLevel, setActiveLevel] = useState<"select" | "deepdive">(
    confirmed ? "deepdive" : "select"
  );

  // Sync tab to confirmed state
  useEffect(() => {
    if (confirmed) setActiveLevel("deepdive");
  }, [confirmed]);

  // ── Level 1: Local state ──
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<number>>(
    () => new Set(savedSelections.map((s) => s.id))
  );
  const [localJustifications, setLocalJustifications] = useState<Record<number, string>>(
    () => {
      const map: Record<number, string> = {};
      savedSelections.forEach((s) => { map[s.id] = s.justification; });
      return map;
    }
  );
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);

  // Sync from saved selections when they change externally
  useEffect(() => {
    setLocalSelectedIds(new Set(savedSelections.map((s) => s.id)));
    const map: Record<number, string> = {};
    savedSelections.forEach((s) => { map[s.id] = s.justification; });
    setLocalJustifications(map);
  }, [savedSelections]);

  // ── Level 2: Deep Dive tab state ──
  const [activeDeepDiveIdx, setActiveDeepDiveIdx] = useState(0);

  // ── Derived ──
  const vpDirections = DIRECTIONS.filter((d) => d.pillar === "Value Proposition");
  const vaDirections = DIRECTIONS.filter((d) => d.pillar === "Value Architecture");
  const canSelectMore = localSelectedIds.size < 3;

  const allJustificationsValid = useMemo(() => {
    if (localSelectedIds.size !== 3) return false;
    return [...localSelectedIds].every(
      (id) => (localJustifications[id] || "").trim().length >= 20
    );
  }, [localSelectedIds, localJustifications]);

  const confirmedDirections: DirectionEntry[] = useMemo(() => {
    if (!confirmed) return [];
    return savedSelections
      .map((s) => DIRECTIONS.find((d) => d.id === s.id))
      .filter(Boolean) as DirectionEntry[];
  }, [confirmed, savedSelections]);

  const deepDiveProgress = useMemo(() => {
    if (confirmedDirections.length === 0) return { done: 0, total: 0 };
    const done = confirmedDirections.filter(
      (d) => deepDives[d.id]?.populated
    ).length;
    return { done, total: confirmedDirections.length };
  }, [confirmedDirections, deepDives]);

  // ── Handlers ──
  const handleToggle = useCallback((id: number) => {
    if (confirmed) return;
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }, [confirmed]);

  const handleJustificationChange = useCallback((id: number, val: string) => {
    if (confirmed) return;
    setLocalJustifications((prev) => ({ ...prev, [id]: val }));
  }, [confirmed]);

  const handleSubmitChallenge = useCallback(() => {
    if (!allJustificationsValid) return;

    // Build the selections array
    const selections: InnovationDirection[] = [...localSelectedIds].map((id) => {
      const dir = DIRECTIONS.find((d) => d.id === id)!;
      return {
        id: dir.id,
        name: dir.name,
        pillar: dir.pillar,
        justification: (localJustifications[id] || "").trim(),
      };
    });

    // Save to portfolio
    updateInnovationSelections(selections);
    setChallengeSubmitted(true);

    // Dispatch custom event for ChatPane to pick up
    window.dispatchEvent(
      new CustomEvent("innovation-challenge", {
        detail: { selections },
      })
    );
  }, [allJustificationsValid, localSelectedIds, localJustifications, updateInnovationSelections]);

  const handleConfirm = useCallback(() => {
    confirmInnovationSelections();
    setActiveLevel("deepdive");
  }, [confirmInnovationSelections]);

  // ══════════════════════════════════════════
  // ── Render ──
  // ══════════════════════════════════════════
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* ── Level Tabs ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 max-w-xs">
          <button
            type="button"
            onClick={() => setActiveLevel("select")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
              activeLevel === "select"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Compass className="w-3.5 h-3.5" />
            Select Directions
          </button>
          <button
            type="button"
            onClick={() => confirmed && setActiveLevel("deepdive")}
            disabled={!confirmed}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
              activeLevel === "deepdive"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-400",
              !confirmed && "opacity-50 cursor-not-allowed"
            )}
          >
            {confirmed ? (
              <Unlock className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            Deep Dive
          </button>
        </div>
      </div>

      {/* ── Level 1: Direction Gallery ── */}
      {activeLevel === "select" && (
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Innovation Directions
              </h1>
            </div>
            <p className="text-xs text-slate-500 ml-9">
              Choose 3 of the 14 Odyssey 3.14 directions that are most relevant for your business.
            </p>
          </div>

          {/* Selection counter */}
          <div className="flex items-center justify-between mb-4 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={clsx(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                      i < localSelectedIds.size
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {i < localSelectedIds.size ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {localSelectedIds.size} / 3 selected
              </span>
            </div>
            {confirmed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>

          {/* Value Proposition Section */}
          <PillarSection
            pillarName="Value Proposition"
            directions={vpDirections}
            selectedIds={localSelectedIds}
            justifications={localJustifications}
            canSelectMore={canSelectMore}
            onToggle={handleToggle}
            onJustificationChange={handleJustificationChange}
            disabled={confirmed}
            pillarIcon="🎯"
            pillarGradient="bg-gradient-to-r from-rose-500 to-orange-500"
          />

          {/* Value Architecture Section */}
          <PillarSection
            pillarName="Value Architecture"
            directions={vaDirections}
            selectedIds={localSelectedIds}
            justifications={localJustifications}
            canSelectMore={canSelectMore}
            onToggle={handleToggle}
            onJustificationChange={handleJustificationChange}
            disabled={confirmed}
            pillarIcon="⚙️"
            pillarGradient="bg-gradient-to-r from-cyan-500 to-blue-600"
          />

          {/* Action buttons */}
          {!confirmed && (
            <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-6 pb-2 -mx-6 px-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-lg p-4">
                {/* Submit for AI Challenge */}
                <button
                  type="button"
                  onClick={handleSubmitChallenge}
                  disabled={!allJustificationsValid || challengeSubmitted}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    allJustificationsValid && !challengeSubmitted
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-200 hover:shadow-lg"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Rocket className="w-4 h-4" />
                  {challengeSubmitted ? "Submitted ✓" : "Submit for AI Challenge"}
                </button>

                {/* Confirm — visible after challenge */}
                {challengeSubmitted && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-200 hover:shadow-lg transition-all duration-200"
                  >
                    Confirm My 3 Directions
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Helper text */}
              {!allJustificationsValid && (
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  {localSelectedIds.size < 3
                    ? `Select ${3 - localSelectedIds.size} more direction${3 - localSelectedIds.size > 1 ? "s" : ""}`
                    : "Each justification needs at least 20 characters"}
                </p>
              )}
            </div>
          )}

          {/* Attribution */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 italic">
              Odyssey 3.14 — Lehmann-Ortega, Musikas, Schoettl
            </p>
          </div>
        </div>
      )}

      {/* ── Level 2: Deep Dive Canvas ── */}
      {activeLevel === "deepdive" && confirmed && (
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 flex flex-col">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                Innovation Deep Dive
              </h1>
            </div>
            <p className="text-xs text-slate-500 ml-9">
              Explore each direction in depth with the AI coach. Fields are populated via your conversation.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Exploration Progress
                </span>
                <span className="text-[10px] font-bold text-indigo-600">
                  {deepDiveProgress.done}/{deepDiveProgress.total} directions explored
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                  style={{
                    width: deepDiveProgress.total > 0
                      ? `${(deepDiveProgress.done / deepDiveProgress.total) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tab bar for confirmed directions */}
          {confirmedDirections.length > 0 && (
            <>
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
                {confirmedDirections.map((dir, idx) => {
                  const dd = deepDives[dir.id];
                  const isActive = idx === activeDeepDiveIdx;
                  const isPopulated = dd?.populated ?? false;

                  return (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => setActiveDeepDiveIdx(idx)}
                      className={clsx(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                          : isPopulated
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <span className="text-base">{dir.icon}</span>
                      <span className="max-w-[140px] truncate">{dir.name}</span>
                      {isPopulated && !isActive && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active tab content */}
              <div className="flex-1">
                {confirmedDirections[activeDeepDiveIdx] && (
                  <DeepDiveTab
                    direction={confirmedDirections[activeDeepDiveIdx]}
                    deepDive={deepDives[confirmedDirections[activeDeepDiveIdx].id]}
                  />
                )}
              </div>
            </>
          )}

          {/* Attribution */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 italic">
              Odyssey 3.14 — Lehmann-Ortega, Musikas, Schoettl
            </p>
          </div>
        </div>
      )}

      {/* Fallback: deep dive but not yet confirmed */}
      {activeLevel === "deepdive" && !confirmed && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Lock className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">
              Deep Dive Locked
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select and confirm your 3 innovation directions first, then come back to explore each one in depth.
            </p>
            <button
              type="button"
              onClick={() => setActiveLevel("select")}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              Go to Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
