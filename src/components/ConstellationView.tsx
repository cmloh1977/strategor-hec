"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type HealthCard } from "@/lib/PortfolioContext";
import { useTeam, type PatternData, type DimensionData, type ChatMessage, type ChallengeEntry, type MemberPlacement } from "@/lib/TeamContext";
import { useAuth } from "@/lib/AuthContext";
import { useDragOnGrid } from "@/lib/useDragOnGrid";
import {
  Users, BarChart3, Sparkles, Map, Target, Swords, Shield, Zap,
  Loader2, Send, ArrowLeft, ChevronRight, FileDown, Star,
  TrendingUp, AlertTriangle, Lightbulb, Link2, MessageCircle, Bot, Move, Rocket
} from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";

// ── Main Component ──
interface ConstellationViewProps {
  onBack: () => void;
}

export default function ConstellationView({ onBack }: ConstellationViewProps) {
  const { team, savePatterns, saveDimensions, clearDimensions, addChatMessage } = useTeam();
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [loadingDimensions, setLoadingDimensions] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedTension, setSelectedTension] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Read from team shared state (persisted in Firestore)
  const cards = team?.memberCards || [];
  const patterns = team?.patterns || null;
  const dimensions = team?.dimensions || null;
  const chatMessages = team?.chatMessages || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Fetch patterns (Level 2) ──
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchPatterns = async () => {
    if (loadingPatterns) return;
    setLoadingPatterns(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, action: "patterns" }),
      });
      const data = await res.json();
      if (!data.error) {
        await savePatterns(data); // persist to team doc
      } else {
        setFetchError(data.error);
      }
    } catch (e) {
      console.error(e);
      setFetchError("Failed to fetch patterns");
    }
    setLoadingPatterns(false);
  };

  // ── Fetch dimensions (Level 3) — only if not cached ──
  const fetchDimensions = async () => {
    if (loadingDimensions) return;
    setLoadingDimensions(true);
    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, action: "dimensions", tension: selectedTension }),
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

  // Auto-fetch when switching levels (refetch if data is stale/missing new fields)
  const isPatternStale = patterns && !patterns.exploitInsights;
  const needsPatternFetch = !patterns || isPatternStale;
  useEffect(() => {
    if (activeLevel === 2 && needsPatternFetch && !loadingPatterns && !fetchError) fetchPatterns();
    if (activeLevel === 3 && !dimensions && !loadingDimensions) fetchDimensions();
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
          {activeLevel === 2 && (
            loadingPatterns 
              ? <LoadingSkeleton label="Analyzing cross-divisional patterns..." />
              : fetchError
                ? <div className="flex flex-col items-center justify-center py-20">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
                    <p className="text-sm font-medium text-slate-700">Pattern analysis failed</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">{fetchError}</p>
                    <button onClick={() => { setFetchError(null); fetchPatterns(); }} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Retry</button>
                  </div>
                : patterns && patterns.exploitInsights
                  ? <Level2Patterns data={patterns} cards={cards} onSelectTension={(t) => { setSelectedTension(t); clearDimensions(); setActiveLevel(3); }} />
                  : null
          )}
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
  const [adjusting, setAdjusting] = useState(false);
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
    if (adjusting) {
      setLocalDragPos(pos);
      return;
    }
    if (!myShareCode || allRevealed) return;
    setLocalDragPos(pos);
  }, [myShareCode, allRevealed, adjusting]);

  const { isDragging, dragPos, handlers: dragHandlers } = useDragOnGrid(gridRef, {
    onDrop: handleDrop,
    enabled: adjusting || (!allRevealed && !!myPlacement && !myPlacement.locked),
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

      <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        {/* ── The 2×2 Grid ── */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="relative h-full">
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
                const canDrag = (isMe && !p.locked && !allRevealed) || (isMe && adjusting);

                // Position priority:
                // 1. Live drag position (while actively dragging)
                // 2. Firestore position (adjusted > self — always the source of truth when locked)
                // 3. Local drag position (only used during pre-lock placement phase)
                // 4. Center fallback (only if not locked yet, so user can grab the bubble)
                let pos: { x: number; y: number } | null;
                if (isMeDragging && dragPos) {
                  pos = dragPos;  // live drag
                } else if (isMe && adjusting && localDragPos) {
                  pos = localDragPos;  // adjusting mode local pos
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
                    onClick={() => {
                      if (adjusting && isMe) return;
                      if (allRevealed) setSelectedMember(p.shareCode);
                    }}
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
                        width: (() => { const s = isMe && (!p.locked || adjusting) ? localBubbleSize : (p.bubbleSize || 5); return 28 + (s - 1) * 6; })(),
                        height: (() => { const s = isMe && (!p.locked || adjusting) ? localBubbleSize : (p.bubbleSize || 5); return 28 + (s - 1) * 6; })(),
                        fontSize: (() => { const s = isMe && (!p.locked || adjusting) ? localBubbleSize : (p.bubbleSize || 5); return s >= 7 ? 11 : s >= 4 ? 9 : 8; })(),
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


            </div>
          </div>
        </div>

        {/* ── Challenge Panel (right side) ── */}
        {allRevealed && selectedMember && selectedPlacement ? (
          <div className="w-[340px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-2xl">
              <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {selectedPlacement.ownerName} — {selectedPlacement.businessName}
              </h4>
              <p className="text-[10px] text-indigo-500 mt-0.5">
                Self: {getQuadrantLabel(selectedPlacement.selfPosition?.x || 50, selectedPlacement.selfPosition?.y || 50)}
              </p>
              {selectedPlacement.justification && (
                <p className="text-[10px] text-slate-600 mt-1 italic">&ldquo;{selectedPlacement.justification}&rdquo;</p>
              )}
            </div>

            {/* Challenge Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
              {/* AI Challenge button — unlocked after 6+ human challenges */}
              {(() => {
                const humanCount = selectedPlacement.challenges.filter((c) => c.type === "human-challenge").length;
                const MIN_CHALLENGES = 6;
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
                adjusting ? (
                  <div className="space-y-2">
                    {/* Size slider during adjustment */}
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600">📏 Growth Potential</label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {localBubbleSize <= 2 ? "Niche" : localBubbleSize <= 4 ? "Emerging" : localBubbleSize <= 6 ? "Established" : localBubbleSize <= 8 ? "Major" : "Dominant"}
                      </span>
                    </div>
                    <input
                      type="range" min={1} max={10} value={localBubbleSize}
                      onChange={(e) => setLocalBubbleSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <p className="text-[9px] text-amber-600 font-medium">↕ Drag your bubble to reposition, adjust size above</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (localDragPos) {
                            await adjustPosition(selectedMember!, localDragPos, localBubbleSize);
                          }
                          setAdjusting(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors"
                      >
                        ✓ Save New Position
                      </button>
                      <button
                        onClick={() => {
                          setLocalDragPos(selectedPlacement.adjustedPosition || selectedPlacement.selfPosition);
                          setLocalBubbleSize(selectedPlacement.bubbleSize || 5);
                          setAdjusting(false);
                        }}
                        className="px-3 py-2 text-slate-500 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setLocalDragPos(selectedPlacement.adjustedPosition || selectedPlacement.selfPosition);
                      setAdjusting(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
                  >
                    <Move className="h-4 w-4" /> Adjust My Position
                  </button>
                )
              )}
            </div>
          </div>
        ) : allRevealed ? (
          <div className="w-[340px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="h-10 w-10 text-slate-200 mb-3" />
            <h4 className="text-sm font-semibold text-slate-500 mb-1">Challenge a Team Member</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Click any bubble on the grid to open their challenge thread and start the strategic discussion.</p>
          </div>
        ) : null}

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




    </div>
  );
}

// ═══════════════════════════════════════
// LEVEL 2: Pattern Recognition (Chat History + VRIO Radar)
// ═══════════════════════════════════════

function VRIORadar({ cards }: { cards: any[] }) {
  const size = 300;
  const center = size / 2;
  const radius = 100;
  
  // 5 levels of grid
  const grids = [1, 2, 3, 4, 5].map(level => {
    const r = (level / 5) * radius;
    return `${center},${center - r} ${center + r},${center} ${center},${center + r} ${center - r},${center}`;
  });

  const getPoints = (v: number, r: number, i: number, o: number) => {
    const pV = `${center},${center - (v/5)*radius}`;
    const pR = `${center + (r/5)*radius},${center}`;
    const pI = `${center},${center + (i/5)*radius}`;
    const pO = `${center - (o/5)*radius},${center}`;
    return `${pV} ${pR} ${pI} ${pO}`;
  };

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="flex flex-col items-center justify-center relative w-[300px] h-[300px] mx-auto">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Grid */}
        {grids.map((points, idx) => (
          <polygon key={idx} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray={idx < 4 ? "4 4" : "none"} />
        ))}
        {/* Axis Lines */}
        <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="#cbd5e1" strokeWidth="1" />
        
        {/* Member Polygons */}
        {cards?.map((card, idx) => {
          const vrio = card.aiAnalysis?.vrio || {};
          const v = vrio.valuable?.strength || 1;
          const r = vrio.rare?.strength || 1;
          const i = vrio.inimitable?.strength || 1;
          const o = vrio.organized?.strength || 1;
          const points = getPoints(v, r, i, o);
          return (
            <polygon 
              key={idx} 
              points={points} 
              fill={colors[idx % colors.length]} 
              fillOpacity="0.15" 
              stroke={colors[idx % colors.length]} 
              strokeWidth="2" 
              className="transition-all duration-300 hover:fill-opacity-50"
            />
          );
        })}
      </svg>
      {/* Labels */}
      <span className="absolute top-[20px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valuable</span>
      <span className="absolute right-[10px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rare</span>
      <span className="absolute bottom-[20px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inimitable</span>
      <span className="absolute left-[10px] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Organized</span>
    </div>
  );
}

function VRIOLegend({ cards }: { cards: any[] }) {
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-4">
      {cards.map((card: any, idx: number) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
          <span className="text-[11px] text-slate-600 font-medium">{card.ownerName || card.businessName}</span>
        </div>
      ))}
    </div>
  );
}

function Level2Patterns({ data, cards, onSelectTension }: { data: PatternData; cards: HealthCard[]; onSelectTension: (tension: string) => void }) {
  // We are expecting: teamNarrative, exploitInsights, exploreInsights
  // For backward compatibility (or if data isn't ready), fallback gracefully
  const exploit = data.exploitInsights || [];
  const explore = data.exploreInsights || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Pattern Discovery</h3>
        <p className="text-slate-500">AI has analyzed {cards.length} divisions' health cards and chat histories to find hidden patterns.</p>
      </div>

      {/* VRIO Overlap Radar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center">
        <h4 className="text-sm font-bold text-slate-800 mb-2">Team Capability Overlay (VRIO)</h4>
        <p className="text-xs text-slate-400 mb-6 max-w-md text-center">Where does the team converge? Where do you diverge? Hover over the shapes to isolate divisions.</p>
        <VRIORadar cards={cards} />
        <VRIOLegend cards={cards} />
      </div>

      {/* Team Narrative */}
      {data.teamNarrative && (
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 rounded-2xl p-6 shadow-md text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-indigo-300" />
            <h4 className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Strategic Narrative</h4>
          </div>
          <p className="text-sm leading-relaxed text-indigo-50">{data.teamNarrative}</p>
        </div>
      )}

      {/* Discoveries */}
      <div>
        <h4 className="text-lg font-bold text-slate-800 mb-4">Hidden Patterns from Coaching Chats</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* Exploit */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-rose-100 rounded text-rose-600"><AlertTriangle className="h-4 w-4" /></div>
              <h5 className="font-bold text-slate-800">"Exploit" Opportunities</h5>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Shared vulnerabilities & redundant resources</p>
            {exploit.length > 0 ? exploit.map((inc: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-rose-300 transition-colors">
                <span className="text-sm font-bold text-rose-700">{inc.title}</span>
                <p className="text-xs text-slate-600 mt-2">{inc.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {inc.divisions?.map((d: string) => <span key={d} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">{d}</span>)}
                </div>
              </div>
            )) : <p className="text-xs text-slate-400 italic">No exploit patterns found.</p>}
          </div>

          {/* Explore */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 rounded text-emerald-600"><Rocket className="h-4 w-4" /></div>
              <h5 className="font-bold text-slate-800">"Explore" Opportunities</h5>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Hidden synergies & combinations</p>
            {explore.length > 0 ? explore.map((inc: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition-colors">
                <span className="text-sm font-bold text-emerald-700">{inc.title}</span>
                <p className="text-xs text-slate-600 mt-2">{inc.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {inc.divisions?.map((d: string) => <span key={d} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-medium">{d}</span>)}
                </div>
              </div>
            )) : <p className="text-xs text-slate-400 italic">No explore patterns found.</p>}
          </div>
        </div>
      </div>

      {/* Sense-Making Input */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-8">
        <h4 className="text-sm font-bold text-indigo-900 mb-2">What do you see?</h4>
        <p className="text-xs text-indigo-700 mb-4">Which of these patterns is the most critical strategic tension for the portfolio? Discuss in the team chat and select one to map into a project.</p>
        <div className="flex gap-4">
          <button 
            onClick={() => onSelectTension(exploit?.[0]?.title || "Exploit opportunity based on shared vulnerabilities")}
            className="flex-1 py-3 px-4 bg-white border border-indigo-200 rounded-xl text-sm font-medium text-indigo-900 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            Vote: Top Exploit Pattern
          </button>
          <button 
            onClick={() => onSelectTension(explore?.[0]?.title || "Explore opportunity based on hidden synergies")}
            className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Vote: Top Explore Pattern
          </button>
        </div>
      </div>
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
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Project Theme Forge</h3>
        <p className="text-slate-500">Mapping the selected tension to TTC&apos;s 4 Higher Dimensions to discover a GALP Action Learning Project.</p>
      </div>

      {/* Tension Mapped */}
      {data.tensionMapped && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-500" /> Strategic Tension Impact
          </h4>
          <p className="text-sm text-slate-700 mb-4">{data.tensionMapped.rationale}</p>
          <div className="flex gap-2 flex-wrap">
            {data.tensionMapped.dimensionsImpacted?.map((d: string) => (
              <span key={d} className={clsx("text-xs font-bold px-3 py-1 rounded-full border", dimLabels[d]?.bg || "bg-slate-50 border-slate-200")}>
                {d} {dimLabels[d]?.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Project Seeds */}
      {data.projectSeeds && data.projectSeeds.length > 0 && (
        <div>
          <h4 className="text-lg font-bold text-slate-800 mb-4">Proposed Project Seeds</h4>
          <div className="space-y-4">
            {data.projectSeeds.map((seed: any, i: number) => (
              <div key={i} className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-indigo-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="text-base font-bold text-indigo-900">{seed.title}</h5>
                  <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider", 
                    seed.type === "Exploration" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {seed.type}
                  </span>
                </div>
                <div className="space-y-3 mt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Strategic Hypothesis</span>
                    <p className="text-sm text-slate-700 mt-1 bg-white rounded-lg p-3 border border-indigo-100 italic">&ldquo;{seed.hypothesis}&rdquo;</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Higher Dimension Leap</span>
                    <p className="text-[13px] text-slate-600 mt-1">{seed.higherDimensionLeap}</p>
                  </div>
                </div>
              </div>
            ))}
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
            {data.coachingQuestions.map((q: string, i: number) => (
              <p key={i} className="text-sm text-amber-900 italic">💡 {q}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
