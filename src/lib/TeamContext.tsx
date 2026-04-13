"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
  commonThreats: { theme: string; description: string; affectedDivisions: string[]; severity: string }[];
  commonStrengths: { theme: string; description: string; divisions: string[] }[];
  synergies: { title: string; description: string; divisions: string[] }[];
  vrioGaps: { dimension: string; observation: string; divisions: string[] }[];
  forcesHeatmap: Record<string, Record<string, number>>;
  industryInsight: string;
  teamNarrative: string;
}

export interface DimensionData {
  dimensionMapping: { pattern: string; dimensions: string[]; valueDomain: string; rationale: string }[];
  suggestedProject: ProjectCanvas & { coachingQuestions?: string[] };
  coachingQuestions: string[];
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
  saveProjectCanvas: (canvas: ProjectCanvas) => Promise<void>;
  addChatMessage: (message: ChatMessage) => Promise<void>;

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
          setTeam(snap.data() as TeamData);
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

      // Check if already a member
      if (teamData.memberUIDs.includes(user.uid)) {
        // Already a member — just reconnect
        await setDoc(doc(db, "users", user.uid, "portfolio", "teamMembership"), { teamCode: normalized });
        setTeamCode(normalized);
        return { success: true };
      }

      // Add to team
      await updateDoc(doc(db, "teams", normalized), {
        memberUIDs: arrayUnion(user.uid),
        memberCards: arrayUnion({ ...myCard, ownerUID: user.uid }),
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
      // Remove membership
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", user.uid, "portfolio", "teamMembership"));
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
        saveProjectCanvas,
        addChatMessage,
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
