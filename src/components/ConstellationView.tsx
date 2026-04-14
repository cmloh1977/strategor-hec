"use client";

import { useState, useEffect, useRef } from "react";
import { type HealthCard } from "@/lib/PortfolioContext";
import { useTeam, type PatternData, type DimensionData, type ChatMessage } from "@/lib/TeamContext";
import {
  Users, BarChart3, Sparkles, Map, Target, Swords, Shield, Zap,
  Loader2, Send, ArrowLeft, ChevronRight, FileDown, Star,
  TrendingUp, AlertTriangle, Lightbulb, Link2
} from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";

// ── Main Component ──
interface ConstellationViewProps {
  onBack: () => void;
}

export default function ConstellationView({ onBack }: ConstellationViewProps) {
  const { team, savePatterns, saveDimensions, addChatMessage } = useTeam();
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [loadingDimensions, setLoadingDimensions] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Read from team shared state (persisted in Firestore)
  const cards = team?.memberCards || [];
  const patterns = team?.patterns || null;
  const dimensions = team?.dimensions || null;
  const chatMessages = team?.chatMessages || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Fetch patterns (Level 2) — only if not cached ──
  const fetchPatterns = async () => {
    if (patterns || loadingPatterns) return;
    setLoadingPatterns(true);
    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, action: "patterns" }),
      });
      const data = await res.json();
      if (!data.error) {
        await savePatterns(data); // persist to team doc
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingPatterns(false);
  };

  // ── Fetch dimensions (Level 3) — only if not cached ──
  const fetchDimensions = async () => {
    if (dimensions || loadingDimensions) return;
    setLoadingDimensions(true);
    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, action: "dimensions" }),
      });
      const data = await res.json();
      if (!data.error) {
        await saveDimensions(data); // persist to team doc
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingDimensions(false);
  };

  // Auto-fetch when switching levels
  useEffect(() => {
    if (activeLevel === 2) fetchPatterns();
    if (activeLevel === 3) fetchDimensions();
  }, [activeLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send chat message (persisted to shared team doc) ──
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");

    const userMsg: ChatMessage = {
      role: "user",
      parts: [{ text: msg }],
      timestamp: new Date().toISOString(),
    };
    await addChatMessage(userMsg); // saves to Firestore immediately
    setChatLoading(true);

    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards,
          action: "chat",
          message: msg,
          chatHistory: [...chatMessages, userMsg].slice(-20), // last 20 messages for context
        }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        role: "model",
        parts: [{ text: data.text || "I couldn't generate a response." }],
        timestamp: new Date().toISOString(),
      };
      await addChatMessage(aiMsg); // saves to Firestore
    } catch (e) {
      await addChatMessage({
        role: "model",
        parts: [{ text: "Error communicating with the AI." }],
        timestamp: new Date().toISOString(),
      });
    }
    setChatLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5" /> Team Constellation
            </h2>
            <p className="text-xs text-white/70">{cards.length} divisions · Cross-divisional strategic analysis</p>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {[
            { level: 1 as const, icon: BarChart3, label: "Compare" },
            { level: 2 as const, icon: Sparkles, label: "Patterns" },
            { level: 3 as const, icon: Map, label: "Strategy" },
          ].map(({ level, icon: Icon, label }) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                activeLevel === level
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>Level {level}: {label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeLevel === 1 && <Level1Grid cards={cards} />}
          {activeLevel === 2 && (loadingPatterns ? <LoadingSkeleton label="Analyzing cross-divisional patterns..." /> : patterns ? <Level2Patterns data={patterns} cards={cards} /> : null)}
          {activeLevel === 3 && (loadingDimensions ? <LoadingSkeleton label="Mapping to TTC's 4 Higher Dimensions..." /> : dimensions ? <Level3Strategy data={dimensions} /> : null)}
        </div>

        {/* Chat Panel (always visible for Levels 2-3) */}
        {activeLevel >= 2 && (
          <div className="w-[380px] border-l border-slate-200 bg-white flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Team Thinking Partner
              </h3>
              <p className="text-[10px] text-indigo-500">Ask about cross-divisional patterns and strategy</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-indigo-300" />
                  <p className="text-sm">Start a team discussion.</p>
                  <p className="text-xs mt-1">I have access to all {cards.length} members&apos; analyses and coaching conversations.</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={clsx(
                    "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-800 rounded-bl-md"
                  )}>
                    {m.role === "model" ? (
                      <div className="prose prose-sm prose-slate max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{m.parts[0].text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{m.parts[0].text}</p>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl px-4 py-3 rounded-bl-md">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask about team patterns..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading Skeleton ──
function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
      <p className="text-sm font-medium text-indigo-700">{label}</p>
      <p className="text-xs text-slate-400 mt-1">This may take a moment...</p>
    </div>
  );
}

function Level1Grid({ cards }: { cards: HealthCard[] }) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // ── Calculate scores for each card ──
  const plotData = cards.map((card) => {
    // X-axis: Competitive Strength (VRIO completeness + BM depth)
    const vrioMet = [card.vrio.valuable.populated, card.vrio.rare.populated, card.vrio.inimitable.populated, card.vrio.organized.populated].filter(Boolean).length;
    const bmPoints = card.businessModel.valueProposition.points.length + card.businessModel.valueArchitecture.points.length + card.businessModel.contributions.points.length;
    // Normalize: VRIO (0-4) contributes 60%, BM depth (0-10+) contributes 40%
    const strengthScore = (vrioMet / 4) * 60 + Math.min(bmPoints / 10, 1) * 40;

    // Y-axis: Market Dynamism (5 Forces intensity — more forces = more dynamic/competitive market)
    const fiveTotal = card.fiveForces.newEntrants.points.length + card.fiveForces.suppliers.points.length + card.fiveForces.rivalry.points.length + card.fiveForces.buyers.points.length + card.fiveForces.substitutes.points.length;
    const dynamismScore = Math.min(fiveTotal / 25, 1) * 100;

    // Bubble size: SWOT completeness (total S+W+O+T points)
    const swotTotal = card.swot.strengths.points.length + card.swot.weaknesses.points.length + card.swot.opportunities.points.length + card.swot.threats.points.length;
    const bubbleSize = Math.max(36, Math.min(64, 28 + swotTotal * 3));

    // SWOT net balance for color intensity
    const swotPos = card.swot.strengths.points.length + card.swot.opportunities.points.length;
    const swotNeg = card.swot.weaknesses.points.length + card.swot.threats.points.length;

    return { card, strengthScore, dynamismScore, bubbleSize, vrioMet, bmPoints, fiveTotal, swotTotal, swotPos, swotNeg };
  });

  // Determine quadrant for a data point (right=strong, top=dynamic)
  const getQuadrant = (strength: number, dynamism: number) => {
    if (strength >= 50 && dynamism >= 50) return "growth";
    if (strength >= 50 && dynamism < 50) return "core";
    if (strength < 50 && dynamism >= 50) return "restructure";
    return "nurture";
  };

  const quadrantInfo = {
    growth: { label: "Growth Business", icon: "🚀", color: "text-blue-800", desc: "Accelerate growth by concentrating resources" },
    core: { label: "Core Business", icon: "🛡️", color: "text-slate-700", desc: "Improve efficiency and polish strengths" },
    nurture: { label: "Nurturing Business", icon: "🌱", color: "text-emerald-700", desc: "Bold challenges for future growth" },
    restructure: { label: "Restructuring Zone", icon: "⚠️", color: "text-amber-700", desc: "Reevaluate and reallocate resources" },
  };

  // Count divisions per quadrant
  const quadrantCounts = { growth: 0, core: 0, nurture: 0, restructure: 0 };
  plotData.forEach(d => { quadrantCounts[getQuadrant(d.strengthScore, d.dynamismScore)]++; });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Strategic Portfolio Grid</h3>
        <p className="text-sm text-slate-500">Each division plotted by Competitive Strength × Market Dynamism</p>
      </div>

      {/* ── The 2×2 Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="relative" style={{ height: 420 }}>
          {/* Y-axis label */}
          <div className="absolute -left-1 top-0 bottom-0 flex items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>
              Market Dynamism (5 Forces) →
            </span>
          </div>

          {/* X-axis label */}
          <div className="absolute bottom-0 left-8 right-0 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Competitive Strength (VRIO + Business Model) →
            </span>
          </div>

          {/* Grid area */}
          <div className="absolute left-8 top-0 right-0 bottom-6 border-l-2 border-b-2 border-slate-200">
            {/* Quadrant backgrounds */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {/* Top-Left: Restructuring (weak + dynamic) */}
              <div className="bg-amber-50/60 border-r border-b border-dashed border-slate-200 p-3 flex flex-col">
                <span className="text-[10px] font-bold text-amber-600/80">⚠️ Restructuring</span>
                <span className="text-[8px] text-amber-500/70 mt-0.5">Reevaluate & reallocate</span>
              </div>
              {/* Top-Right: Growth (strong + dynamic) */}
              <div className="bg-blue-50/60 border-b border-dashed border-slate-200 p-3 flex flex-col items-end">
                <span className="text-[10px] font-bold text-blue-600/80">🚀 Growth Business</span>
                <span className="text-[8px] text-blue-500/70 mt-0.5">Accelerate & expand</span>
              </div>
              {/* Bottom-Left: Nurturing (weak + stable) */}
              <div className="bg-emerald-50/40 border-r border-dashed border-slate-200 p-3 flex flex-col justify-end">
                <span className="text-[8px] text-emerald-500/70 mb-0.5">Build for the future</span>
                <span className="text-[10px] font-bold text-emerald-600/80">🌱 Nurturing</span>
              </div>
              {/* Bottom-Right: Core (strong + stable) */}
              <div className="bg-slate-50/60 p-3 flex flex-col items-end justify-end">
                <span className="text-[8px] text-slate-400 mb-0.5">Improve efficiency</span>
                <span className="text-[10px] font-bold text-slate-500">🛡️ Core Business</span>
              </div>
            </div>

            {/* Center crosshair labels */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-slate-300" />
            <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-slate-300" />

            {/* Bubbles */}
            {plotData.map((d) => {
              const x = Math.max(5, Math.min(95, d.strengthScore));
              const y = Math.max(5, Math.min(95, 100 - d.dynamismScore)); // invert Y so high dynamism is top
              const quadrant = getQuadrant(d.strengthScore, d.dynamismScore);
              const isHovered = hoveredCard === d.card.shareCode;
              const bubbleColor = quadrant === "growth" ? "bg-blue-500" : quadrant === "core" ? "bg-slate-500" : quadrant === "nurture" ? "bg-emerald-500" : "bg-amber-500";
              const ringColor = quadrant === "growth" ? "ring-blue-200" : quadrant === "core" ? "ring-slate-200" : quadrant === "nurture" ? "ring-emerald-200" : "ring-amber-200";

              return (
                <div
                  key={d.card.shareCode}
                  className="absolute transition-all duration-300 ease-out cursor-pointer group"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`,
                    zIndex: isHovered ? 50 : 10,
                  }}
                  onMouseEnter={() => setHoveredCard(d.card.shareCode)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Bubble */}
                  <div
                    className={clsx(
                      "rounded-full flex items-center justify-center text-white font-bold text-[9px] shadow-lg ring-2 transition-shadow",
                      bubbleColor, ringColor,
                      isHovered ? "shadow-xl ring-4" : "shadow-md"
                    )}
                    style={{ width: d.bubbleSize, height: d.bubbleSize }}
                  >
                    {d.card.ownerName?.split(" ")[0]?.substring(0, 4)}
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white rounded-xl px-4 py-3 text-[11px] whitespace-nowrap shadow-2xl z-50 pointer-events-none">
                      <p className="font-bold text-sm mb-1">{d.card.businessName}</p>
                      <p className="text-slate-300 text-[10px] mb-2">{d.card.ownerName} · {d.card.ownerRegion}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        <span className="text-slate-400">VRIO:</span>
                        <span className="font-medium">{d.vrioMet}/4 dimensions</span>
                        <span className="text-slate-400">Business Model:</span>
                        <span className="font-medium">{d.bmPoints} points</span>
                        <span className="text-slate-400">5 Forces:</span>
                        <span className="font-medium">{d.fiveTotal} factors</span>
                        <span className="text-slate-400">SWOT:</span>
                        <span className="font-medium text-emerald-400">+{d.swotPos}</span>
                        <span className="text-slate-400"></span>
                        <span className="font-medium text-red-400">-{d.swotNeg}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-700 text-[10px]">
                        <span className="text-slate-400">Quadrant: </span>
                        <span className="font-semibold">{quadrantInfo[quadrant].icon} {quadrantInfo[quadrant].label}</span>
                      </div>
                      {/* Arrow pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Quadrant Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {(["growth", "core", "nurture", "restructure"] as const).map((q) => {
          const info = quadrantInfo[q];
          const count = quadrantCounts[q];
          const divisions = plotData.filter(d => getQuadrant(d.strengthScore, d.dynamismScore) === q);
          const bgColors = { growth: "bg-blue-50 border-blue-200", core: "bg-slate-50 border-slate-200", nurture: "bg-emerald-50 border-emerald-200", restructure: "bg-amber-50 border-amber-200" };
          return (
            <div key={q} className={clsx("rounded-xl border p-3", bgColors[q])}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{info.icon}</span>
                <span className={clsx("text-xs font-bold", info.color)}>{info.label}</span>
                <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded-full font-bold text-slate-500 ml-auto">{count}</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-2">{info.desc}</p>
              {divisions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {divisions.map(d => (
                    <span key={d.card.shareCode} className="text-[9px] bg-white/70 px-2 py-0.5 rounded-full text-slate-600 font-medium border border-white/50">
                      {d.card.businessName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Division Detail Cards (collapsed) ── */}
      <details className="group">
        <summary className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700 transition-colors flex items-center gap-2">
          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">▶</span>
          View individual division details ({cards.length} divisions)
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plotData.map((d) => {
            const q = getQuadrant(d.strengthScore, d.dynamismScore);
            const colors = { growth: "border-blue-300", core: "border-slate-300", nurture: "border-emerald-300", restructure: "border-amber-300" };
            return (
              <div key={d.card.shareCode} className={clsx("bg-white rounded-xl border-2 shadow-sm overflow-hidden", colors[q])}>
                <div className="px-4 py-2.5" style={{ backgroundColor: d.card.color + "10", borderBottom: `2px solid ${d.card.color}` }}>
                  <h5 className="text-xs font-bold text-slate-800 truncate">{d.card.businessName}</h5>
                  <p className="text-[9px] text-slate-500">{d.card.ownerName} · {d.card.ownerRegion}</p>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-4 gap-2 text-[9px]">
                  <div>
                    <span className="text-slate-400 block">VRIO</span>
                    <span className="font-bold text-slate-700">{d.vrioMet}/4</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">BM</span>
                    <span className="font-bold text-slate-700">{d.bmPoints}pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">5F</span>
                    <span className="font-bold text-slate-700">{d.fiveTotal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">SWOT</span>
                    <span className="font-bold text-emerald-600">+{d.swotPos}</span>
                    <span className="font-bold text-red-500 ml-0.5">-{d.swotNeg}</span>
                  </div>
                </div>
                <div className="px-4 py-1.5 bg-slate-50 text-[9px] text-slate-500">
                  {quadrantInfo[q].icon} {quadrantInfo[q].label}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

// ═══════════════════════════════════════
// LEVEL 2: Pattern Recognition
// ═══════════════════════════════════════

function Level2Patterns({ data, cards }: { data: PatternData; cards: HealthCard[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Cross-Divisional Patterns</h3>
        <p className="text-sm text-slate-500">AI-identified patterns across {cards.length} divisions</p>
      </div>

      {/* Team Narrative */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h4 className="text-sm font-bold text-indigo-800">Team Strategic Narrative</h4>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{data.teamNarrative}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Common Threats */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h4 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" /> Shared Threats
          </h4>
          <div className="space-y-3">
            {data.commonThreats?.map((t, i) => (
              <div key={i} className="border-l-2 border-red-300 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{t.theme}</span>
                  <span className={clsx("text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                    t.severity === "high" ? "bg-red-100 text-red-700" : t.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  )}>{t.severity}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{t.description}</p>
                <p className="text-[9px] text-slate-400 mt-1">{t.affectedDivisions?.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Common Strengths */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" /> Shared Strengths
          </h4>
          <div className="space-y-3">
            {data.commonStrengths?.map((s, i) => (
              <div key={i} className="border-l-2 border-emerald-300 pl-3">
                <span className="text-xs font-bold text-slate-800">{s.theme}</span>
                <p className="text-[11px] text-slate-600 mt-1">{s.description}</p>
                <p className="text-[9px] text-slate-400 mt-1">{s.divisions?.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synergy Opportunities */}
      {data.synergies?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4" /> Synergy Opportunities
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {data.synergies.map((s, i) => (
              <div key={i} className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <span className="text-xs font-bold text-blue-800">{s.title}</span>
                <p className="text-[11px] text-slate-600 mt-1">{s.description}</p>
                <p className="text-[9px] text-blue-500 mt-1 font-medium">{s.divisions?.join(" × ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 Forces Heatmap */}
      {data.forcesHeatmap && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Swords className="h-4 w-4 text-red-500" /> 5 Forces Heatmap
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-500 font-medium">Division</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">New Ent.</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Suppliers</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Rivalry</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Buyers</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Subst.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.forcesHeatmap).map(([div, forces]) => (
                  <tr key={div} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-700 truncate max-w-[120px]">{div}</td>
                    {["newEntrants", "suppliers", "rivalry", "buyers", "substitutes"].map((f) => {
                      const val = (forces as any)[f] || 0;
                      const bg = val <= 3 ? "bg-emerald-100 text-emerald-700" : val <= 6 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                      return (
                        <td key={f} className="text-center py-2 px-2">
                          <span className={clsx("inline-block w-8 py-0.5 rounded font-bold", bg)}>{val}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 italic">{data.industryInsight}</p>
        </div>
      )}

      {/* VRIO Gaps */}
      {data.vrioGaps?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4" /> VRIO Gaps Across Team
          </h4>
          <div className="space-y-2">
            {data.vrioGaps.map((g, i) => (
              <div key={i} className="flex gap-3 items-start bg-emerald-50 rounded-xl p-3">
                <span className="text-xs font-bold bg-emerald-200 text-emerald-800 rounded px-2 py-0.5">{g.dimension}</span>
                <div>
                  <p className="text-[11px] text-slate-700">{g.observation}</p>
                  <p className="text-[9px] text-slate-400 mt-1">{g.divisions?.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// LEVEL 3: Strategic Synthesis
// ═══════════════════════════════════════

function Level3Strategy({ data }: { data: DimensionData }) {
  const dimLabels: Record<string, { label: string; color: string; bg: string }> = {
    "①": { label: "Growth Investment", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    "②": { label: "Capital Policies", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
    "③": { label: "Human Capital", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    "④": { label: "Sustainability", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Strategic Synthesis — Higher Dimensions</h3>
        <p className="text-sm text-slate-500">Mapping team patterns to TTC&apos;s Mid-Term Business Plan</p>
      </div>

      {/* Dimension Mapping */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-4">Pattern → Dimension Mapping</h4>
        <div className="space-y-3">
          {data.dimensionMapping?.map((m, i) => (
            <div key={i} className="border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-700 mb-2">{m.pattern}</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {m.dimensions?.map((d) => (
                  <span key={d} className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", dimLabels[d]?.bg || "bg-slate-50")}>
                    {d} {dimLabels[d]?.label}
                  </span>
                ))}
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-medium">
                  {m.valueDomain}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 italic">{m.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Project Canvas */}
      {data.suggestedProject && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-white">
            <h4 className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="h-5 w-5" /> Group Action Learning Project Canvas
            </h4>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Project Title</label>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{data.suggestedProject.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">TTC Dimension(s)</label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {data.suggestedProject.dimensions?.map((d) => (
                    <span key={d} className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", dimLabels[d]?.bg)}>
                      {d} {dimLabels[d]?.label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Value Domain</label>
                <p className="text-sm font-semibold text-indigo-700 mt-1">{data.suggestedProject.valueDomain}</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cross-Divisional Challenge</label>
              <p className="text-sm text-slate-700 mt-0.5">{data.suggestedProject.challenge}</p>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Strategic Hypothesis</label>
              <p className="text-sm text-slate-700 mt-0.5 bg-white/80 rounded-lg p-2 border border-indigo-100 italic">&ldquo;{data.suggestedProject.hypothesis}&rdquo;</p>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">&ldquo;Higher Dimension&rdquo; Leap</label>
              <p className="text-sm text-slate-700 mt-0.5">{data.suggestedProject.higherDimensionLeap}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Divisions Involved</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.suggestedProject.divisionsInvolved?.map((d, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Key Metrics</label>
                <ul className="mt-1 space-y-0.5">
                  {data.suggestedProject.keyMetrics?.map((m, i) => (
                    <li key={i} className="text-[11px] text-slate-600">• {m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">First 90 Days</label>
              <div className="mt-1 space-y-1.5">
                {data.suggestedProject.first90Days?.map((a, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="text-[11px] text-slate-700">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coaching Questions */}
      {data.coachingQuestions?.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4" /> Questions to Deepen Your Thinking
          </h4>
          <div className="space-y-2">
            {data.coachingQuestions.map((q, i) => (
              <p key={i} className="text-sm text-amber-900 italic">💡 {q}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
