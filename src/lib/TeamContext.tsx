"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, deleteField } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import type { HealthCard } from "./PortfolioContext";

// ── Types ──

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
  senderName?: string;
  timestamp?: string;
}

export interface ProjectCanvas {
  title: string;
  dimensions: string[];
  valueDomain: string;
  challenge: string;
  hypothesis: string;
  higherDimensionLeap: string;
  divisionsInvolved: string[];
  keyMetrics: string[];
  first90Days: string[];
}

export interface PatternData {
  teamNarrative: string;
  exploitInsights: { title: string; description: string; divisions: string[] }[];
  exploreInsights: { title: string; description: string; divisions: string[] }[];
  // Legacy fields (backward compat with cached data)
  commonThreats?: { theme: string; description: string; affectedDivisions: string[]; severity: string }[];
  commonStrengths?: { theme: string; description: string; divisions: string[] }[];
  synergies?: { title: string; description: string; divisions: string[] }[];
  vrioGaps?: { dimension: string; observation: string; divisions: string[] }[];
  forcesHeatmap?: Record<string, Record<string, number>>;
  industryInsight?: string;
}

export interface DimensionData {
  tensionMapped: {
    dimensionsImpacted: string[];
    rationale: string;
  };
  projectSeeds: {
    title: string;
    type: string;
    hypothesis: string;
    higherDimensionLeap: string;
  }[];
  coachingQuestions: string[];
  // Legacy fields (backward compat with cached data)
  dimensionMapping?: { pattern: string; dimensions: string[]; valueDomain: string; rationale: string }[];
  suggestedProject?: ProjectCanvas & { coachingQuestions?: string[] };
}

// ── V8: Placement / Challenge Types ──

export interface ChallengeEntry {
  id: string;
  type: "human-challenge" | "ai-challenge" | "response";
  authorName: string;
  authorUID: string;
  text: string;
  timestamp: string;
}

export interface MemberPlacement {
  shareCode: string;
  ownerUID: string;
  ownerName: string;
  businessName: string;
  selfPosition: { x: number; y: number } | null;
  justification: string;
  locked: boolean;
  aiPosition: { x: number; y: number };
  adjustedPosition: { x: number; y: number } | null;
  challenges: ChallengeEntry[];
  aiChallengeGenerated: boolean;
  bubbleSize: number; // 1-10 scale, default 5
}

export interface PlacementState {
  placements: MemberPlacement[];
  allRevealed: boolean;
  portfolioSynthesis: string | null;
}

export interface TeamData {
  teamName: string;
  joinCode: string;
  leaderUID: string;
  leaderName: string;
  memberUIDs: string[];
  memberCards: HealthCard[];
  patterns: PatternData | null;
  dimensions: DimensionData | null;
  projectCanvas: ProjectCanvas | null;
  chatMessages: ChatMessage[];
  placementState: PlacementState | null;
  createdAt: string;
  updatedAt: string;
}

// ── Context Type ──

interface TeamContextType {
  team: TeamData | null;
  teamLoading: boolean;
  teamError: string | null;

  // Actions
  createTeam: (teamName: string, myCard: HealthCard, importedCards?: HealthCard[]) => Promise<string | null>;
  joinTeam: (code: string, myCard: HealthCard) => Promise<{ success: boolean; error?: string }>;
  leaveTeam: () => Promise<void>;

  // Shared state persistence
  savePatterns: (data: PatternData) => Promise<void>;
  saveDimensions: (data: DimensionData) => Promise<void>;
  clearDimensions: () => Promise<void>;
  saveProjectCanvas: (canvas: ProjectCanvas) => Promise<void>;
  addChatMessage: (message: ChatMessage) => Promise<void>;

  // V8: Placement actions
  savePlacement: (shareCode: string, position: { x: number; y: number }, justification: string, aiPosition: { x: number; y: number }, lock?: boolean, bubbleSize?: number) => Promise<void>;
  lockPlacement: (shareCode: string) => Promise<void>;
  revealAll: () => Promise<void>;
  addChallenge: (targetShareCode: string, entry: ChallengeEntry) => Promise<void>;
  adjustPosition: (shareCode: string, newPosition: { x: number; y: number }, bubbleSize?: number) => Promise<void>;
  savePortfolioSynthesis: (synthesis: string) => Promise<void>;
  initPlacements: (cards: HealthCard[], computeAIPosition: (card: HealthCard) => { x: number; y: number }) => Promise<void>;
  syncPlacements: (cards: HealthCard[], existingPlacements: MemberPlacement[], computeAIPosition: (card: HealthCard) => { x: number; y: number }) => Promise<void>;
  resetPlacements: () => Promise<void>;

  // Derived
  isLeader: boolean;
  isInTeam: boolean;
}

const TeamContext = createContext<TeamContextType | null>(null);

function generateTeamCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TM-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  // ── Load user's team membership ──
  useEffect(() => {
    if (!user) {
      setTeamLoading(false);
      return;
    }

    // Check if user has a team assigned
    const unsub = onSnapshot(
      doc(db, "users", user.uid, "portfolio", "teamMembership"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setTeamCode(data.teamCode || null);
        } else {
          setTeamCode(null);
        }
        setTeamLoading(false);
      },
      (err) => {
        console.error("Team membership load error:", err);
        setTeamLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ── Listen to team data (real-time) ──
  useEffect(() => {
    if (!teamCode) {
      setTeam(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "teams", teamCode),
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as TeamData;
          let needsClean = false;
          const cleanUpdate: Record<string, any> = { updatedAt: new Date().toISOString() };

          // Deduplicate memberCards by shareCode (prefer entries with ownerUID set)
          if (raw.memberCards?.length) {
            const seen = new Map<string, typeof raw.memberCards[0]>();
            for (const card of raw.memberCards) {
              const existing = seen.get(card.shareCode);
              if (!existing || (card.ownerUID && !existing.ownerUID)) {
                seen.set(card.shareCode, card);
              }
            }
            const deduped = Array.from(seen.values());
            if (deduped.length < raw.memberCards.length) {
              console.log(`🧹 Auto-cleaning ${raw.memberCards.length - deduped.length} duplicate card(s)`);
              raw.memberCards = deduped;
              cleanUpdate.memberCards = deduped;
              needsClean = true;
            }
          }

          // Deduplicate placementState.placements by shareCode
          if (raw.placementState?.placements?.length) {
            const validShareCodes = new Set(raw.memberCards.map((c) => c.shareCode));
            const seenPlacement = new Set<string>();
            const dedupedPlacements = raw.placementState.placements.filter((p) => {
              // Remove duplicates AND orphaned placements (no matching card)
              if (seenPlacement.has(p.shareCode)) return false;
              seenPlacement.add(p.shareCode);
              return validShareCodes.has(p.shareCode);
            });
            if (dedupedPlacements.length < raw.placementState.placements.length) {
              console.log(`🧹 Auto-cleaning ${raw.placementState.placements.length - dedupedPlacements.length} orphaned/duplicate placement(s)`);
              raw.placementState = { ...raw.placementState, placements: dedupedPlacements };
              cleanUpdate["placementState.placements"] = dedupedPlacements;
              needsClean = true;
            }
          }

          // Write cleanup to Firestore if needed
          if (needsClean) {
            updateDoc(doc(db, "teams", teamCode), cleanUpdate).catch(console.error);
          }

          setTeam(raw);
        } else {
          setTeam(null);
          setTeamCode(null);
        }
      },
      (err) => {
        console.error("Team data load error:", err);
      }
    );
    return () => unsub();
  }, [teamCode]);

  // ── Create Team ──
  const createTeam = useCallback(async (teamName: string, myCard: HealthCard, importedCards?: HealthCard[]): Promise<string | null> => {
    if (!user) return null;
    const code = generateTeamCode();

    // Combine own card + all imported cards
    const allCards: HealthCard[] = [{ ...myCard, ownerUID: user.uid }];
    const allUIDs: string[] = [user.uid];

    if (importedCards) {
      for (const card of importedCards) {
        allCards.push(card);
        if (card.ownerUID && !allUIDs.includes(card.ownerUID)) {
          allUIDs.push(card.ownerUID);
        }
      }
    }

    const teamDoc: TeamData = {
      teamName,
      joinCode: code,
      leaderUID: user.uid,
      leaderName: myCard.ownerName,
      memberUIDs: allUIDs,
      memberCards: allCards,
      patterns: null,
      dimensions: null,
      projectCanvas: null,
      chatMessages: [],
      placementState: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "teams", code), teamDoc);
      await setDoc(doc(db, "users", user.uid, "portfolio", "teamMembership"), { teamCode: code });
      setTeamCode(code);
      return code;
    } catch (e) {
      console.error("Create team error:", e);
      setTeamError("Failed to create team");
      return null;
    }
  }, [user]);

  // ── Join Team ──
  const joinTeam = useCallback(async (code: string, myCard: HealthCard): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not logged in" };
    const normalized = code.trim().toUpperCase();

    try {
      const snap = await getDoc(doc(db, "teams", normalized));
      if (!snap.exists()) {
        return { success: false, error: "Team code not found" };
      }

      const teamData = snap.data() as TeamData;
      const cardWithUID = { ...myCard, ownerUID: user.uid };

      // Check if already a member by UID
      if (teamData.memberUIDs.includes(user.uid)) {
        // Already a member — update existing card (set ownerUID if missing) and reconnect
        const updatedCards = teamData.memberCards.map((c) =>
          c.shareCode === myCard.shareCode ? cardWithUID : c
        );
        // Deduplicate by shareCode in case of prior corruption
        const seen = new Set<string>();
        const deduped = updatedCards.filter((c) => {
          if (seen.has(c.shareCode)) return false;
          seen.add(c.shareCode);
          return true;
        });
        await updateDoc(doc(db, "teams", normalized), {
          memberCards: deduped,
          updatedAt: new Date().toISOString(),
        });
        await setDoc(doc(db, "users", user.uid, "portfolio", "teamMembership"), { teamCode: normalized });
        setTeamCode(normalized);
        return { success: true };
      }

      // New member — replace any imported card (same shareCode) or append
      const existingIdx = teamData.memberCards.findIndex((c) => c.shareCode === myCard.shareCode);
      let updatedCards: HealthCard[];
      if (existingIdx >= 0) {
        // Replace imported card with the user's own card (which has ownerUID)
        updatedCards = [...teamData.memberCards];
        updatedCards[existingIdx] = cardWithUID;
      } else {
        updatedCards = [...teamData.memberCards, cardWithUID];
      }

      // Deduplicate by shareCode
      const seen = new Set<string>();
      const deduped = updatedCards.filter((c) => {
        if (seen.has(c.shareCode)) return false;
        seen.add(c.shareCode);
        return true;
      });

      await updateDoc(doc(db, "teams", normalized), {
        memberUIDs: arrayUnion(user.uid),
        memberCards: deduped,
        updatedAt: new Date().toISOString(),
      });

      // Save membership to user's doc
      await setDoc(doc(db, "users", user.uid, "portfolio", "teamMembership"), { teamCode: normalized });
      setTeamCode(normalized);
      return { success: true };
    } catch (e) {
      console.error("Join team error:", e);
      return { success: false, error: "Failed to join team" };
    }
  }, [user]);

  // ── Leave Team ──
  const leaveTeam = useCallback(async () => {
    if (!user || !teamCode) return;
    try {
      // Read current team data to remove user's card
      const teamSnap = await getDoc(doc(db, "teams", teamCode));
      if (teamSnap.exists()) {
        const teamData = teamSnap.data() as TeamData;
        const filteredCards = teamData.memberCards.filter((c) => c.ownerUID !== user.uid);
        const filteredUIDs = teamData.memberUIDs.filter((uid) => uid !== user.uid);
        await updateDoc(doc(db, "teams", teamCode), {
          memberCards: filteredCards,
          memberUIDs: filteredUIDs,
          updatedAt: new Date().toISOString(),
        });
      }
      // Remove local membership
      const { deleteDoc: delDoc } = await import("firebase/firestore");
      await delDoc(doc(db, "users", user.uid, "portfolio", "teamMembership"));
      setTeamCode(null);
      setTeam(null);
    } catch (e) {
      console.error("Leave team error:", e);
    }
  }, [user, teamCode]);

  // ── Save Shared State ──
  const savePatterns = useCallback(async (data: PatternData) => {
    if (!teamCode) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        patterns: data,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Save patterns error:", e);
    }
  }, [teamCode]);

  const saveDimensions = useCallback(async (data: DimensionData) => {
    if (!teamCode) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        dimensions: data,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Save dimensions error:", e);
    }
  }, [teamCode]);

  const clearDimensions = useCallback(async () => {
    if (!teamCode) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        dimensions: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Clear dimensions error:", e);
    }
  }, [teamCode]);

  const saveProjectCanvas = useCallback(async (canvas: ProjectCanvas) => {
    if (!teamCode) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        projectCanvas: canvas,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Save canvas error:", e);
    }
  }, [teamCode]);

  const addChatMessage = useCallback(async (message: ChatMessage) => {
    if (!teamCode) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        chatMessages: arrayUnion(message),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Add chat message error:", e);
    }
  }, [teamCode]);

  // ── V8: Placement Actions ──

  const initPlacements = useCallback(async (
    cards: HealthCard[],
    computeAIPosition: (card: HealthCard) => { x: number; y: number }
  ) => {
    if (!teamCode || !team) return;

    const existing = team.placementState?.placements || [];

    // Case 1: Fresh init — no placements exist yet
    if (existing.length === 0) {
      const placements: MemberPlacement[] = cards.map((card) => ({
        shareCode: card.shareCode,
        ownerUID: card.ownerUID || "",
        ownerName: card.ownerName,
        businessName: card.businessName,
        selfPosition: null,
        justification: "",
        locked: false,
        aiPosition: computeAIPosition(card),
        adjustedPosition: null,
        challenges: [],
        aiChallengeGenerated: false,
        bubbleSize: 5,
      }));
      const state: PlacementState = { placements, allRevealed: false, portfolioSynthesis: null };
      try {
        await updateDoc(doc(db, "teams", teamCode), {
          placementState: state,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Init placements error:", e);
      }
      return;
    }

    // Case 2: Placements exist — check for new members who joined after init
    const existingShareCodes = new Set(existing.map((p) => p.shareCode));
    const newCards = cards.filter((c) => !existingShareCodes.has(c.shareCode));

    if (newCards.length === 0) return; // everyone already has a placement

    const newPlacements: MemberPlacement[] = newCards.map((card) => ({
      shareCode: card.shareCode,
      ownerUID: card.ownerUID || "",
      ownerName: card.ownerName,
      businessName: card.businessName,
      selfPosition: null,
      justification: "",
      locked: false,
      aiPosition: computeAIPosition(card),
      adjustedPosition: null,
      challenges: [],
      aiChallengeGenerated: false,
      bubbleSize: 5,
    }));

    const merged = [...existing, ...newPlacements];
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        "placementState.placements": merged,
        updatedAt: new Date().toISOString(),
      });
      console.log(`Synced ${newCards.length} new member(s) into placements.`);
    } catch (e) {
      console.error("Sync new placements error:", e);
    }
  }, [teamCode, team]);

  // Sync late-joiners or patch existing placements
  // If cards is empty, just writes existingPlacements as-is (for patching ownerUIDs etc.)
  const syncPlacements = useCallback(async (
    cards: HealthCard[],
    existingPlacements: MemberPlacement[],
    computeAIPosition: (card: HealthCard) => { x: number; y: number }
  ) => {
    if (!teamCode) return;
    
    // Patch mode: no cards, just write the placements directly
    if (cards.length === 0 && existingPlacements.length > 0) {
      try {
        await updateDoc(doc(db, "teams", teamCode), {
          "placementState.placements": existingPlacements,
          updatedAt: new Date().toISOString(),
        });
        console.log(`🔧 Patched placements in Firestore`);
      } catch (e) {
        console.error("Patch placements error:", e);
      }
      return;
    }

    // Sync mode: find missing cards and append
    const existingShareCodes = new Set(existingPlacements.map((p) => p.shareCode));
    const newCards = cards.filter((c) => !existingShareCodes.has(c.shareCode));
    if (newCards.length === 0) return;

    const newPlacements: MemberPlacement[] = newCards.map((card) => ({
      shareCode: card.shareCode,
      ownerUID: card.ownerUID || "",
      ownerName: card.ownerName,
      businessName: card.businessName,
      selfPosition: null,
      justification: "",
      locked: false,
      aiPosition: computeAIPosition(card),
      adjustedPosition: null,
      challenges: [],
      aiChallengeGenerated: false,
      bubbleSize: 5,
    }));
    const merged = [...existingPlacements, ...newPlacements];
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        "placementState.placements": merged,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Synced ${newCards.length} new member(s) into placements:`, newCards.map(c => c.ownerName));
    } catch (e) {
      console.error("Sync new placements error:", e);
    }
  }, [teamCode]); // Only depends on teamCode string — NO stale closure risk

  const savePlacement = useCallback(async (
    shareCode: string,
    position: { x: number; y: number },
    justification: string,
    aiPosition: { x: number; y: number },
    lock: boolean = false,
    bubbleSize?: number
  ) => {
    if (!teamCode || !team?.placementState) return;
    const updated = {
      ...team.placementState,
      placements: team.placementState.placements.map((p) =>
        p.shareCode === shareCode
          ? { ...p, selfPosition: position, justification, aiPosition, ...(lock ? { locked: true } : {}), ...(bubbleSize !== undefined ? { bubbleSize } : {}) }
          : p
      ),
    };
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        placementState: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Save placement error:", e);
    }
  }, [teamCode, team]);

  const lockPlacement = useCallback(async (shareCode: string) => {
    if (!teamCode || !team?.placementState) return;
    const updated = {
      ...team.placementState,
      placements: team.placementState.placements.map((p) =>
        p.shareCode === shareCode ? { ...p, locked: true } : p
      ),
    };
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        placementState: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Lock placement error:", e);
    }
  }, [teamCode, team]);

  const revealAll = useCallback(async () => {
    if (!teamCode || !team?.placementState) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        "placementState.allRevealed": true,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Reveal all error:", e);
    }
  }, [teamCode, team]);

  const addChallenge = useCallback(async (targetShareCode: string, entry: ChallengeEntry) => {
    if (!teamCode || !team?.placementState) return;
    const updated = {
      ...team.placementState,
      placements: team.placementState.placements.map((p) =>
        p.shareCode === targetShareCode
          ? { ...p, challenges: [...p.challenges, entry], ...(entry.type === "ai-challenge" ? { aiChallengeGenerated: true } : {}) }
          : p
      ),
    };
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        placementState: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Add challenge error:", e);
    }
  }, [teamCode, team]);

  const adjustPosition = useCallback(async (shareCode: string, newPosition: { x: number; y: number }, bubbleSize?: number) => {
    if (!teamCode || !team?.placementState) return;
    const updated = {
      ...team.placementState,
      placements: team.placementState.placements.map((p) =>
        p.shareCode === shareCode ? { ...p, adjustedPosition: newPosition, ...(bubbleSize !== undefined ? { bubbleSize } : {}) } : p
      ),
    };
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        placementState: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Adjust position error:", e);
    }
  }, [teamCode, team]);

  const savePortfolioSynthesis = useCallback(async (synthesis: string) => {
    if (!teamCode || !team?.placementState) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        "placementState.portfolioSynthesis": synthesis,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Save portfolio synthesis error:", e);
    }
  }, [teamCode, team]);

  const resetPlacements = useCallback(async () => {
    if (!teamCode) return;
    try {
      await updateDoc(doc(db, "teams", teamCode), {
        placementState: deleteField(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Reset placements error:", e);
    }
  }, [teamCode]);

  // ── Derived ──
  const isLeader = !!user && !!team && team.leaderUID === user.uid;
  const isInTeam = !!team && !!user && team.memberUIDs.includes(user.uid);

  return (
    <TeamContext.Provider
      value={{
        team,
        teamLoading,
        teamError,
        createTeam,
        joinTeam,
        leaveTeam,
        savePatterns,
        saveDimensions,
        clearDimensions,
        saveProjectCanvas,
        addChatMessage,
        savePlacement,
        lockPlacement,
        revealAll,
        addChallenge,
        adjustPosition,
        savePortfolioSynthesis,
        initPlacements,
        syncPlacements,
        resetPlacements,
        isLeader,
        isInTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error("useTeam must be used within TeamProvider");
  return context;
};
