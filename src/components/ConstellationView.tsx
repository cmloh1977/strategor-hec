"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type HealthCard } from "@/lib/PortfolioContext";
import { useTeam, type PatternData, type DimensionData, type ChatMessage, type ChallengeEntry, type MemberPlacement } from "@/lib/TeamContext";
import { useAuth } from "@/lib/AuthContext";
import { useDragOnGrid } from "@/lib/useDragOnGrid";
import {
  Users, BarChart3, Sparkles, Map, Target, Swords, Shield, Zap,
  Loader2, Send, ArrowLeft, ChevronRight, FileDown, Star,
  TrendingUp, AlertTriangle, Lightbulb, Link2, MessageCircle, Bot, Move
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
          {activeLevel === 1 && <CollaborativeGrid cards={cards} />}
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

// ═══════════════════════════════════════
// AI Position Computation (reused from old Level1Grid)
// ═══════════════════════════════════════

function computeAIPosition(card: HealthCard): { x: number; y: number } {
  const ai = card.aiAnalysis;
  let strengthScore: number, dynamismScore: number;

  if (ai) {
    const vrioTotal = ai.vrio.valuable.strength + ai.vrio.rare.strength + ai.vrio.inimitable.strength + ai.vrio.organized.strength;
    const bmTotal = ai.businessModel.valueProposition.score + ai.businessModel.valueArchitecture.score + ai.businessModel.contributions.score;
    const vrioNorm = (vrioTotal / 20) * 100;
    const bmNorm = (bmTotal / 15) * 100;
    strengthScore = (vrioNorm * 0.6) + (bmNorm * 0.4);
    const forcesTotal = ai.fiveForces.newEntrants.severity + ai.fiveForces.suppliers.severity + ai.fiveForces.rivalry.severity + ai.fiveForces.buyers.severity + ai.fiveForces.substitutes.severity;
    dynamismScore = (forcesTotal / 50) * 100;
  } else {
    const vrioMet = [card.vrio.valuable.populated, card.vrio.rare.populated, card.vrio.inimitable.populated, card.vrio.organized.populated].filter(Boolean).length;
    const bmPoints = card.businessModel.valueProposition.points.length + card.businessModel.valueArchitecture.points.length + card.businessModel.contributions.points.length;
    const fiveTotal = card.fiveForces.newEntrants.points.length + card.fiveForces.suppliers.points.length + card.fiveForces.rivalry.points.length + card.fiveForces.buyers.points.length + card.fiveForces.substitutes.points.length;
    strengthScore = (vrioMet / 4) * 60 + Math.min(bmPoints / 10, 1) * 40;
    dynamismScore = Math.min(fiveTotal / 25, 1) * 100;
  }

  return { x: Math.max(5, Math.min(95, strengthScore)), y: Math.max(5, Math.min(95, dynamismScore)) };
}

function getQuadrantLabel(x: number, y: number): string {
  if (x >= 50 && y >= 50) return "Growth";
  if (x >= 50 && y < 50) return "Core";
  if (x < 50 && y >= 50) return "Restructuring";
  return "Nurturing";
}

// ═══════════════════════════════════════
// LEVEL 1: Collaborative Grid (V8)
// ═══════════════════════════════════════

function CollaborativeGrid({ cards }: { cards: HealthCard[] }) {
  const { user } = useAuth();
  const { team, initPlacements, savePlacement, lockPlacement, revealAll, addChallenge, adjustPosition, savePortfolioSynthesis, resetPlacements, isLeader } = useTeam();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [challengeText, setChallengeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [justification, setJustification] = useState("");
  const [localDragPos, setLocalDragPos] = useState<{ x: number; y: number } | null>(null);
  const [localBubbleSize, setLocalBubbleSize] = useState(5);
  const gridRef = useRef<HTMLDivElement>(null);
  const challengeEndRef = useRef<HTMLDivElement>(null);

  const ps = team?.placementState;
  const placements = ps?.placements || [];
  const allRevealed = ps?.allRevealed || false;

  // Find current user's placement
  const myPlacement = placements.find((p) => p.ownerUID === user?.uid);
  const myShareCode = myPlacement?.shareCode || "";

  // Initialize placements on first load
  useEffect(() => {
    if (cards.length >= 2 && team && !ps?.placements?.length) {
      initPlacements(cards, computeAIPosition);
    }
  }, [cards, team]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore localDragPos from Firestore (e.g. after leaving and re-entering Level 1)
  useEffect(() => {
    if (myPlacement?.selfPosition && !localDragPos) {
      setLocalDragPos(myPlacement.selfPosition);
    }
    if (myPlacement?.justification && !justification) {
      setJustification(myPlacement.justification);
    }
    if (myPlacement?.bubbleSize && localBubbleSize === 5) {
      setLocalBubbleSize(myPlacement.bubbleSize);
    }
  }, [myPlacement?.selfPosition, myPlacement?.justification, myPlacement?.bubbleSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll challenge panel to bottom
  useEffect(() => {
    challengeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMember, placements]);

  // Number locked
  const lockedCount = placements.filter((p) => p.locked).length;
  const allLocked = lockedCount === placements.length && placements.length > 0;

  // Selected member's placement
  const selectedPlacement = placements.find((p) => p.shareCode === selectedMember);

  // Drag handler for self-placement
  const handleDrop = useCallback((pos: { x: number; y: number }) => {
    if (!myShareCode || allRevealed) return;
    setLocalDragPos(pos);
  }, [myShareCode, allRevealed]);

  const { isDragging, dragPos, handlers: dragHandlers } = useDragOnGrid(gridRef, {
    onDrop: handleDrop,
    enabled: !allRevealed && !!myPlacement && !myPlacement.locked,
  });

  // Save placement AND lock in one atomic write (prevents race condition)
  const handleLock = async () => {
    const pos = localDragPos || dragPos;
    if (!pos || !justification.trim()) return;
    const aiPos = computeAIPosition(cards.find((c) => c.shareCode === myShareCode) || cards[0]);
    await savePlacement(myShareCode, pos, justification, aiPos, true, localBubbleSize); // true = lock
  };

  // Submit a challenge
  const submitChallenge = async () => {
    if (!challengeText.trim() || !selectedMember || !user) return;
    const entry: ChallengeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "human-challenge",
      authorName: myPlacement?.ownerName || user.email || "Unknown",
      authorUID: user.uid,
      text: challengeText.trim(),
      timestamp: new Date().toISOString(),
    };
    await addChallenge(selectedMember, entry);
    setChallengeText("");
  };

  // Trigger AI challenge for selected member
  const triggerAIChallenge = async () => {
    if (!selectedPlacement || aiLoading) return;
    setAiLoading(true);
    try {
      const targetCard = cards.find((c) => c.shareCode === selectedMember);
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards,
          action: "member-challenge",
          targetShareCode: selectedMember,
          targetCard,
          selfPosition: selectedPlacement.selfPosition,
          aiPosition: selectedPlacement.aiPosition,
          humanChallenges: selectedPlacement.challenges.filter((c) => c.type === "human-challenge"),
          previousAICommentary: placements
            .filter((p) => p.aiChallengeGenerated && p.shareCode !== selectedMember)
            .map((p) => ({ name: p.ownerName, business: p.businessName, challenges: p.challenges.filter((c) => c.type === "ai-challenge") })),
        }),
      });
      const data = await res.json();
      if (data.text) {
        const aiEntry: ChallengeEntry = {
          id: `ai-${Date.now()}`,
          type: "ai-challenge",
          authorName: "AI Strategy Coach",
          authorUID: "ai",
          text: data.text,
          timestamp: new Date().toISOString(),
        };
        await addChallenge(selectedMember!, aiEntry);
      }
    } catch (e) {
      console.error("AI challenge error:", e);
    }
    setAiLoading(false);
  };

  // Trigger portfolio synthesis
  const triggerPortfolioSynthesis = async () => {
    if (portfolioLoading) return;
    setPortfolioLoading(true);
    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards,
          action: "portfolio-synthesis",
          placements: placements.map((p) => ({
            ownerName: p.ownerName,
            businessName: p.businessName,
            selfPosition: p.selfPosition,
            aiPosition: p.aiPosition,
            adjustedPosition: p.adjustedPosition,
            challenges: p.challenges,
          })),
        }),
      });
      const data = await res.json();
      if (data.text) {
        await savePortfolioSynthesis(data.text);
      }
    } catch (e) {
      console.error("Portfolio synthesis error:", e);
    }
    setPortfolioLoading(false);
  };

  // Active position for the side panel (shows where user is dragging or has last placed)
  const activeDragPos = isDragging && dragPos ? dragPos : (localDragPos || myPlacement?.selfPosition || null);

  return (
    <div className="space-y-4">
      {/* Phase Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-0.5">
            {!allRevealed ? "📌 Place Your Business" : selectedMember ? `🔍 Challenging: ${selectedPlacement?.businessName}` : "Strategic Portfolio Grid"}
          </h3>
          <p className="text-sm text-slate-500">
            {!allRevealed
              ? `Drag your icon to where you believe your business belongs. ${lockedCount}/${placements.length} locked.`
              : !selectedMember
              ? "Click any bubble to open their challenge thread"
              : `Team discussion for ${selectedPlacement?.ownerName}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!allRevealed && allLocked && (
            <button onClick={revealAll} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              ✨ Reveal All Positions
            </button>
          )}
          {allRevealed && !selectedMember && !ps?.portfolioSynthesis && (
            <button onClick={triggerPortfolioSynthesis} disabled={portfolioLoading} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50">
              {portfolioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔮 Portfolio Synthesis"}
            </button>
          )}
          {isLeader && placements.length > 0 && (
            <button
              onClick={() => { if (confirm("Reset all placements? Everyone will need to re-place.")) { resetPlacements(); setLocalDragPos(null); setJustification(""); } }}
              className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              🔄 Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* ── The 2×2 Grid ── */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="relative" style={{ height: 420 }}>
            {/* Y-axis label */}
            <div className="absolute -left-1 top-0 bottom-0 flex items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>
                <span className="font-normal opacity-60">STABLE</span>
                <span>← Market Dynamism (5 Forces) →</span>
                <span className="font-normal opacity-60">INTENSE</span>
              </span>
            </div>

            {/* X-axis label */}
            <div className="absolute bottom-0 left-8 right-0 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="font-normal opacity-60">WEAK</span>
                <span>← Competitive Strength (VRIO + BM) →</span>
                <span className="font-normal opacity-60">STRONG</span>
              </span>
            </div>

            {/* Grid area */}
            <div ref={gridRef} className="absolute left-8 top-0 right-0 bottom-6 border-l-2 border-b-2 border-slate-200">
              {/* Quadrant backgrounds */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="bg-amber-50/60 border-r border-b border-dashed border-slate-200 p-3 flex flex-col">
                  <span className="text-[10px] font-bold text-amber-600/80">⚠️ Restructuring</span>
                  <span className="text-[8px] text-amber-500/70 mt-0.5">Reevaluate &amp; reallocate</span>
                </div>
                <div className="bg-blue-50/60 border-b border-dashed border-slate-200 p-3 flex flex-col items-end">
                  <span className="text-[10px] font-bold text-blue-600/80">🚀 Growth Business</span>
                  <span className="text-[8px] text-blue-500/70 mt-0.5">Accelerate &amp; expand</span>
                </div>
                <div className="bg-emerald-50/40 border-r border-dashed border-slate-200 p-3 flex flex-col justify-end">
                  <span className="text-[8px] text-emerald-500/70 mb-0.5">Build for the future</span>
                  <span className="text-[10px] font-bold text-emerald-600/80">🌱 Nurturing</span>
                </div>
                <div className="bg-slate-50/60 p-3 flex flex-col items-end justify-end">
                  <span className="text-[8px] text-slate-400 mb-0.5">Improve efficiency</span>
                  <span className="text-[10px] font-bold text-slate-500">🛡️ Core Business</span>
                </div>
              </div>

              {/* Center crosshair */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-slate-300" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-slate-300" />

              {/* ── Bubbles ── */}
              {placements.map((p) => {
                const isMe = p.ownerUID === user?.uid;
                const isMeDragging = isMe && isDragging;
                const canDrag = isMe && !p.locked && !allRevealed;

                // Position priority:
                // 1. Live drag position (while actively dragging)
                // 2. Firestore position (adjusted > self — always the source of truth when locked)
                // 3. Local drag position (only used during pre-lock placement phase)
                // 4. Center fallback (only if not locked yet, so user can grab the bubble)
                let pos: { x: number; y: number } | null;
                if (isMeDragging && dragPos) {
                  pos = dragPos;  // live drag
                } else if (p.adjustedPosition || p.selfPosition) {
                  pos = p.adjustedPosition || p.selfPosition;  // Firestore = source of truth
                } else if (isMe && localDragPos) {
                  pos = localDragPos;  // pre-lock local state
                } else {
                  pos = null;
                }

                const isSelected = p.shareCode === selectedMember;

                // During blind phase: only show self
                if (!allRevealed && !isMe) return null;

                // Show bubble: always fall back to center if position data is missing
                const displayPos = pos || { x: 50, y: 50 };

                const quadrant = getQuadrantLabel(displayPos.x, displayPos.y);
                const bubbleColor = quadrant === "Growth" ? "bg-blue-500" : quadrant === "Core" ? "bg-slate-500" : quadrant === "Nurturing" ? "bg-emerald-500" : "bg-amber-500";
                const ringColor = isSelected ? "ring-indigo-400" : quadrant === "Growth" ? "ring-blue-200" : quadrant === "Core" ? "ring-slate-200" : quadrant === "Nurturing" ? "ring-emerald-200" : "ring-amber-200";

                return (
                  <div
                    key={p.shareCode}
                    className={clsx(
                      "absolute z-10",
                      canDrag ? "cursor-grab active:cursor-grabbing" : allRevealed ? "cursor-pointer" : "",
                      isMeDragging && "z-50",
                      !isMeDragging && "transition-all duration-200 ease-out",
                      !allRevealed && isMe && !p.locked && !pos && "animate-pulse"
                    )}
                    style={{
                      left: `${displayPos.x}%`,
                      top: `${100 - displayPos.y}%`,
                      transform: `translate(-50%, -50%) scale(${isSelected ? 1.15 : isMeDragging ? 1.2 : 1})`,
                    }}
                    onClick={() => allRevealed && setSelectedMember(p.shareCode === selectedMember ? null : p.shareCode)}
                    {...(canDrag ? dragHandlers : {})}
                  >
                    <div
                      className={clsx(
                        "rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 transition-all",
                        bubbleColor, ringColor,
                        isSelected ? "ring-4 shadow-xl" : "shadow-md",
                        isMe && !allRevealed && !p.locked && "ring-4 ring-indigo-400"
                      )}
                      style={{
                        width: (() => { const s = isMe && !p.locked ? localBubbleSize : (p.bubbleSize || 5); return 28 + (s - 1) * 6; })(),
                        height: (() => { const s = isMe && !p.locked ? localBubbleSize : (p.bubbleSize || 5); return 28 + (s - 1) * 6; })(),
                        fontSize: (() => { const s = isMe && !p.locked ? localBubbleSize : (p.bubbleSize || 5); return s >= 7 ? 11 : s >= 4 ? 9 : 8; })(),
                      }}
                    >
                      {p.ownerName?.split(" ")[0]?.substring(0, 4)}
                    </div>
                    {/* Name label */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] font-medium text-slate-600 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded">
                      {p.businessName?.substring(0, 15)}
                    </div>
                    {/* Lock badge */}
                    {!allRevealed && p.locked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[8px]">✓</div>
                    )}
                    {/* Challenge count badge */}
                    {allRevealed && p.challenges.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                        {p.challenges.length}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* AI Position markers — only visible in selected member's challenge panel after AI triggered */}
              {allRevealed && selectedPlacement?.aiChallengeGenerated && (
                <div
                  className="absolute transition-all duration-500 z-5 pointer-events-none"
                  style={{
                    left: `${selectedPlacement.aiPosition.x}%`,
                    top: `${100 - selectedPlacement.aiPosition.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="w-11 h-11 rounded-full border-2 border-dashed border-indigo-400 flex items-center justify-center text-indigo-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[8px] text-indigo-500 font-medium whitespace-nowrap">AI position</div>
                </div>
              )}

              {/* Gap line between self and AI position */}
              {allRevealed && selectedPlacement?.aiChallengeGenerated && selectedPlacement?.selfPosition && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <line
                    x1={`${selectedPlacement.selfPosition.x}%`}
                    y1={`${100 - selectedPlacement.selfPosition.y}%`}
                    x2={`${selectedPlacement.aiPosition.x}%`}
                    y2={`${100 - selectedPlacement.aiPosition.y}%`}
                    stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* ── Challenge Panel (right side) ── */}
        {allRevealed && selectedMember && selectedPlacement && (
          <div className="w-[340px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-2xl">
              <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {selectedPlacement.ownerName} — {selectedPlacement.businessName}
              </h4>
              <p className="text-[10px] text-indigo-500 mt-0.5">
                Self: {getQuadrantLabel(selectedPlacement.selfPosition?.x || 50, selectedPlacement.selfPosition?.y || 50)}
                {selectedPlacement.aiChallengeGenerated && ` · AI: ${getQuadrantLabel(selectedPlacement.aiPosition.x, selectedPlacement.aiPosition.y)}`}
              </p>
              {selectedPlacement.justification && (
                <p className="text-[10px] text-slate-600 mt-1 italic">&ldquo;{selectedPlacement.justification}&rdquo;</p>
              )}
            </div>

            {/* Challenge Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[280px]">
              {selectedPlacement.challenges.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <MessageCircle className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">No challenges yet. Be the first!</p>
                </div>
              )}
              {selectedPlacement.challenges.map((c) => (
                <div key={c.id} className={clsx(
                  "rounded-xl px-3 py-2 text-sm",
                  c.type === "ai-challenge"
                    ? "bg-indigo-50 border border-indigo-100"
                    : c.authorUID === user?.uid
                    ? "bg-blue-50 border border-blue-100 ml-4"
                    : "bg-slate-50 border border-slate-100"
                )}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {c.type === "ai-challenge" ? (
                      <Bot className="h-3 w-3 text-indigo-500" />
                    ) : (
                      <MessageCircle className="h-3 w-3 text-slate-400" />
                    )}
                    <span className={clsx("text-[10px] font-bold", c.type === "ai-challenge" ? "text-indigo-600" : "text-slate-500")}>
                      {c.authorName}
                    </span>
                    <span className="text-[9px] text-slate-300 ml-auto">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {c.type === "ai-challenge" ? (
                    <div className="prose prose-sm prose-indigo max-w-none text-[11px] [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:mt-2">
                      <ReactMarkdown>{c.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-700">{c.text}</p>
                  )}
                </div>
              ))}
              <div ref={challengeEndRef} />
            </div>

            {/* Input + buttons */}
            <div className="p-3 border-t border-slate-100 space-y-2">
              {/* Challenge input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={challengeText}
                  onChange={(e) => setChallengeText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitChallenge()}
                  placeholder="Challenge this position..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button onClick={submitChallenge} disabled={!challengeText.trim()} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {/* AI Challenge button — unlocked after 10+ human challenges */}
              {(() => {
                const humanCount = selectedPlacement.challenges.filter((c) => c.type === "human-challenge").length;
                const MIN_CHALLENGES = 10;
                const unlocked = humanCount >= MIN_CHALLENGES;
                return (
                  <button
                    onClick={triggerAIChallenge}
                    disabled={aiLoading || !unlocked}
                    className={clsx(
                      "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm",
                      unlocked
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    )}
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                    {aiLoading
                      ? "AI is analyzing..."
                      : unlocked
                      ? "🤖 AI Challenge Me"
                      : `🔒 ${MIN_CHALLENGES - humanCount} more challenges to unlock AI`
                    }
                  </button>
                );
              })()}
              {/* Adjust position button (for the owner of this analysis) */}
              {selectedPlacement.ownerUID === user?.uid && selectedPlacement.aiChallengeGenerated && (
                <button
                  onClick={() => {
                    // Enable drag mode for adjustment — just reset lock so they can re-drag
                    const pos = localDragPos || selectedPlacement.selfPosition;
                    if (pos) adjustPosition(selectedMember!, pos);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <Move className="h-4 w-4" /> Adjust My Position
                </button>
              )}
            </div>
          </div>
        )}

        {/* Justification panel (blind phase, for self) */}
        {!allRevealed && (
          <div className="w-[280px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Move className="h-4 w-4 text-indigo-500" />
              Your Placement
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Drag your icon on the grid. Think about where your business honestly sits in terms of <strong>competitive strength</strong> and <strong>market dynamism</strong>.
            </p>
            {activeDragPos && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                📍 {getQuadrantLabel(activeDragPos.x, activeDragPos.y)} quadrant
              </div>
            )}
            {/* Growth Potential slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600">📏 Growth Potential</label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {localBubbleSize <= 2 ? "Niche" : localBubbleSize <= 4 ? "Emerging" : localBubbleSize <= 6 ? "Established" : localBubbleSize <= 8 ? "Major" : "Dominant"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={localBubbleSize}
                onChange={(e) => setLocalBubbleSize(Number(e.target.value))}
                disabled={myPlacement?.locked}
                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[8px] text-slate-300 px-0.5">
                <span>Niche</span>
                <span>Dominant</span>
              </div>
            </div>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why did you place yourself here? (required)"
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              rows={3}
            />
            <button
              onClick={handleLock}
              disabled={!activeDragPos || !justification.trim() || myPlacement?.locked}
              className={clsx(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
                myPlacement?.locked
                  ? "bg-emerald-100 text-emerald-700 cursor-default"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {myPlacement?.locked ? "✓ Position Locked" : "🔒 Lock My Position"}
            </button>
            {myPlacement?.locked && !allLocked && (
              <p className="text-[10px] text-slate-400 text-center">Waiting for others... ({lockedCount}/{placements.length})</p>
            )}
          </div>
        )}
      </div>

      {/* Completed members bar */}
      {allRevealed && (
        <div className="flex flex-wrap gap-2">
          {placements.map((p) => (
            <button
              key={p.shareCode}
              onClick={() => setSelectedMember(p.shareCode === selectedMember ? null : p.shareCode)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                p.shareCode === selectedMember
                  ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                  : p.aiChallengeGenerated
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200"
              )}
            >
              {p.aiChallengeGenerated && <span>✓</span>}
              {p.businessName?.substring(0, 20)}
              {p.challenges.length > 0 && (
                <span className="bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-full">{p.challenges.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Portfolio Synthesis */}
      {ps?.portfolioSynthesis && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h4 className="text-sm font-bold text-purple-800">Portfolio Synthesis</h4>
          </div>
          <div className="prose prose-sm prose-purple max-w-none text-slate-700 [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-purple-800 [&>h3]:mt-3">
            <ReactMarkdown>{ps.portfolioSynthesis}</ReactMarkdown>
          </div>
        </div>
      )}
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
