"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

// ── Pillar Data ──
export interface PillarData {
  points: string[];
  populated: boolean;
}

export interface BusinessModelState {
  valueProposition: PillarData;
  valueArchitecture: PillarData;
  contributions: PillarData;
}

export interface FiveForcesState {
  newEntrants: PillarData;
  suppliers: PillarData;
  rivalry: PillarData;
  buyers: PillarData;
  substitutes: PillarData;
}

export interface VrioState {
  valuable: PillarData;
  rare: PillarData;
  inimitable: PillarData;
  organized: PillarData;
}

export interface SwotState {
  strengths: PillarData;
  weaknesses: PillarData;
  opportunities: PillarData;
  threats: PillarData;
}

export interface AIAnalysis {
  businessModel: {
    valueProposition: { score: number; insight: string };
    valueArchitecture: { score: number; insight: string };
    contributions: { score: number; insight: string };
  };
  fiveForces: {
    newEntrants: { severity: number; label: string };
    suppliers: { severity: number; label: string };
    rivalry: { severity: number; label: string };
    buyers: { severity: number; label: string };
    substitutes: { severity: number; label: string };
    overallAttractiveness: string;
  };
  vrio: {
    valuable: { strength: number; insight: string };
    rare: { strength: number; insight: string };
    inimitable: { strength: number; insight: string };
    organized: { strength: number; insight: string };
    competitiveAdvantage: string;
  };
  swot: {
    strengthsWeight: number;
    weaknessesWeight: number;
    opportunitiesWeight: number;
    threatsWeight: number;
  };
  narrative: string;
  priorities: { urgency: string; text: string }[];
  healthScore: number;
}

// ── Health Card (the shareable snapshot) ──
export interface HealthCard {
  shareCode: string;
  ownerUID?: string;
  ownerName: string;
  ownerEmail: string;
  ownerRegion: string;
  businessName: string;
  businessDescription: string;
  color: string;
  businessModel: BusinessModelState;
  fiveForces: FiveForcesState;
  vrio: VrioState;
  swot: SwotState;
  industryAttractiveness: number;
  competitiveStrength: number;
  aiAnalysis?: AIAnalysis; // Include the AI scores if they generated them
}

// ── Language & Difficulty ──
export type AppLanguage = "en" | "ja" | "fr" | "zh";
export type DifficultyLevel = "high-school" | "bachelors" | "masters" | "phd";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  ja: "日本語",
  fr: "Français",
  zh: "中文",
};

export const LANGUAGE_FLAGS: Record<AppLanguage, string> = {
  en: "🇬🇧",
  ja: "🇯🇵",
  fr: "🇫🇷",
  zh: "🇨🇳",
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  "high-school": "High School",
  "bachelors": "Bachelor's",
  "masters": "Master's",
  "phd": "PhD",
};

// ── My Analysis (the user's own single business) ──
export interface MyAnalysis {
  businessName: string;
  businessDescription: string;
  ownerName: string;
  ownerRegion: string;
  color: string;
  chatLanguage: AppLanguage;
  diagramLanguage: AppLanguage;
  difficultyLevel: DifficultyLevel;
  businessModel: BusinessModelState;
  fiveForces: FiveForcesState;
  vrio: VrioState;
  swot: SwotState;
}

// ── Portfolio State ──
export interface PortfolioState {
  myAnalysis: MyAnalysis | null;
  shareCode: string | null;
  teamCards: HealthCard[];
}

// ── Helpers ──
const emptyPillar: PillarData = { points: [], populated: false };

const INIT_BM: BusinessModelState = {
  valueProposition: emptyPillar, valueArchitecture: emptyPillar, contributions: emptyPillar,
};
const INIT_5F: FiveForcesState = {
  newEntrants: emptyPillar, suppliers: emptyPillar, rivalry: emptyPillar, buyers: emptyPillar, substitutes: emptyPillar,
};
const INIT_VRIO: VrioState = {
  valuable: emptyPillar, rare: emptyPillar, inimitable: emptyPillar, organized: emptyPillar,
};
const INIT_SWOT: SwotState = {
  strengths: emptyPillar, weaknesses: emptyPillar, opportunities: emptyPillar, threats: emptyPillar,
};

const COLORS = ["#E8634A", "#1EB5C4", "#6366f1", "#f59e0b", "#10b981"];

function computeIsComplete(a: MyAnalysis): boolean {
  return (
    a.businessModel.valueProposition.populated &&
    a.businessModel.valueArchitecture.populated &&
    a.businessModel.contributions.populated &&
    a.fiveForces.newEntrants.populated &&
    a.fiveForces.suppliers.populated &&
    a.fiveForces.rivalry.populated &&
    a.fiveForces.buyers.populated &&
    a.fiveForces.substitutes.populated &&
    a.vrio.valuable.populated &&
    a.vrio.rare.populated &&
    a.vrio.inimitable.populated &&
    a.vrio.organized.populated &&
    a.swot.strengths.populated &&
    a.swot.weaknesses.populated &&
    a.swot.opportunities.populated &&
    a.swot.threats.populated
  );
}

function computeAttractiveness(ff: FiveForcesState): number {
  let score = 0;
  if (ff.newEntrants.populated) score++;
  if (ff.suppliers.populated) score++;
  if (ff.rivalry.populated) score++;
  if (ff.buyers.populated) score++;
  if (ff.substitutes.populated) score++;
  return score;
}

function computeStrength(vrio: VrioState): number {
  let score = 0;
  if (vrio.valuable.populated) score++;
  if (vrio.rare.populated) score++;
  if (vrio.inimitable.populated) score++;
  if (vrio.organized.populated) score++;
  return Math.round((score / 4) * 5);
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0,O,1,I to avoid confusion
  let code = "TT-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getProgress(a: MyAnalysis): { done: number; total: number; percent: number } {
  const total = 16;
  let done = 0;
  if (a.businessModel.valueProposition.populated) done++;
  if (a.businessModel.valueArchitecture.populated) done++;
  if (a.businessModel.contributions.populated) done++;
  if (a.fiveForces.newEntrants.populated) done++;
  if (a.fiveForces.suppliers.populated) done++;
  if (a.fiveForces.rivalry.populated) done++;
  if (a.fiveForces.buyers.populated) done++;
  if (a.fiveForces.substitutes.populated) done++;
  if (a.vrio.valuable.populated) done++;
  if (a.vrio.rare.populated) done++;
  if (a.vrio.inimitable.populated) done++;
  if (a.vrio.organized.populated) done++;
  if (a.swot.strengths.populated) done++;
  if (a.swot.weaknesses.populated) done++;
  if (a.swot.opportunities.populated) done++;
  if (a.swot.threats.populated) done++;
  return { done, total, percent: Math.round((done / total) * 100) };
}

// ── Context Type ──
interface PortfolioContextType {
  portfolio: PortfolioState;
  isLoading: boolean;

  // My Analysis
  startAnalysis: (name: string, region: string, businessName: string, businessDesc: string, chatLang: AppLanguage, difficulty: DifficultyLevel) => void;
  resetAnalysis: () => void;
  setDiagramLanguage: (lang: AppLanguage) => void;
  populatePillar: (module: "businessModel" | "fiveForces" | "vrio" | "swot", pillar: string, points: string[]) => void;
  myAnalysisComplete: boolean;
  myAnalysisProgress: { done: number; total: number; percent: number };

  // Share Code
  generateShareCode: () => Promise<string | null>;
  shareCode: string | null;

  // Team
  importShareCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeTeamCard: (code: string) => void;
  teamCards: HealthCard[];

  // Phase 2
  phase2Unlocked: boolean;
  constellationCards: HealthCard[]; // own card + imported cards
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const INIT_PORTFOLIO: PortfolioState = {
  myAnalysis: null,
  shareCode: null,
  teamCards: [],
};

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioState>(INIT_PORTFOLIO);
  const [isLoading, setIsLoading] = useState(true);

  // ── Firestore sync: Load ──
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid, "portfolio", "current"),
      (docSnap) => {
        if (docSnap.exists()) {
          setPortfolio(docSnap.data() as PortfolioState);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Portfolio load error:", error);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ── Firestore sync: Save ──
  const saveToFirestore = useCallback(
    async (data: PortfolioState) => {
      if (!user) return;
      try {
        await setDoc(doc(db, "users", user.uid, "portfolio", "current"), data);
      } catch (e) {
        console.error("Portfolio save error:", e);
      }
    },
    [user]
  );

  const update = useCallback(
    (updater: (prev: PortfolioState) => PortfolioState) => {
      setPortfolio((prev) => {
        const next = updater(prev);
        saveToFirestore(next);
        return next;
      });
    },
    [saveToFirestore]
  );

  // ── Actions: My Analysis ──
  const startAnalysis = (name: string, region: string, businessName: string, businessDesc: string, chatLang: AppLanguage = "en", difficulty: DifficultyLevel = "masters") => {
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    update((p) => ({
      ...p,
      myAnalysis: {
        businessName,
        businessDescription: businessDesc,
        ownerName: name,
        ownerRegion: region,
        color: COLORS[colorIndex],
        chatLanguage: chatLang,
        diagramLanguage: chatLang,
        difficultyLevel: difficulty,
        businessModel: INIT_BM,
        fiveForces: INIT_5F,
        vrio: INIT_VRIO,
        swot: INIT_SWOT,
      },
    }));
  };

  const setDiagramLanguage = (lang: AppLanguage) => {
    update((p) => {
      if (!p.myAnalysis) return p;
      return { ...p, myAnalysis: { ...p.myAnalysis, diagramLanguage: lang } };
    });
  };

  const resetAnalysis = () => {
    update((p) => ({ ...p, myAnalysis: null, shareCode: null }));
    // Also clear chat docs from Firestore
    if (user) {
      const chatModules = ["business-model", "external-analysis", "internal-analysis", "swot-synthesis"];
      chatModules.forEach(async (mod) => {
        try {
          const { deleteDoc, doc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          await deleteDoc(doc(db, "users", user.uid, "chats", mod));
        } catch (e) { /* ignore */ }
      });
    }
  };

  const populatePillar = (
    module: "businessModel" | "fiveForces" | "vrio" | "swot",
    pillar: string,
    points: string[]
  ) => {
    update((p) => {
      if (!p.myAnalysis) return p;
      return {
        ...p,
        myAnalysis: {
          ...p.myAnalysis,
          [module]: {
            ...p.myAnalysis[module],
            [pillar]: { points, populated: true },
          },
        },
      };
    });
  };

  // ── Actions: Share Code ──
  const generateShareCode = async (): Promise<string | null> => {
    if (!user || !portfolio.myAnalysis || !computeIsComplete(portfolio.myAnalysis)) return null;

    // If already generated, return existing
    if (portfolio.shareCode) return portfolio.shareCode;

    const code = generateCode();
    const a = portfolio.myAnalysis;

    // Try to grab the AI Analysis if it exists
    let aiAnalysisScore: AIAnalysis | undefined = undefined;
    try {
      const snap = await getDoc(doc(db, "users", user.uid, "portfolio", "healthAnalysis"));
      if (snap.exists()) {
        const cached = snap.data() as AIAnalysis & { businessName?: string };
        if (cached.businessName === a.businessName) {
          aiAnalysisScore = cached;
        }
      }
    } catch (e) {
      console.error("Failed to load health analysis for share code:", e);
    }

    const healthCard: HealthCard = {
      shareCode: code,
      ownerUID: user.uid,
      ownerName: a.ownerName,
      ownerEmail: user.email || "",
      ownerRegion: a.ownerRegion,
      businessName: a.businessName,
      businessDescription: a.businessDescription,
      color: a.color,
      businessModel: a.businessModel,
      fiveForces: a.fiveForces,
      vrio: a.vrio,
      swot: a.swot,
      industryAttractiveness: computeAttractiveness(a.fiveForces),
      competitiveStrength: computeStrength(a.vrio),
      ...(aiAnalysisScore ? { aiAnalysis: aiAnalysisScore } : {})
    };

    try {
      // Write to the shared collection
      await setDoc(doc(db, "shareCodes", code), healthCard);

      // Save to own portfolio
      const newState = { ...portfolio, shareCode: code };
      await saveToFirestore(newState);
      setPortfolio(newState);

      return code;
    } catch (e) {
      console.error("Error generating share code:", e);
      return null;
    }
  };

  // ── Actions: Team Import ──
  const importShareCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not logged in" };

    const normalized = code.trim().toUpperCase();

    // Check if already imported
    if (portfolio.teamCards.some((c) => c.shareCode === normalized)) {
      return { success: false, error: "This code is already imported" };
    }

    // Check if it's your own code
    if (normalized === portfolio.shareCode) {
      return { success: false, error: "You can't import your own code" };
    }

    try {
      const snap = await getDoc(doc(db, "shareCodes", normalized));
      if (!snap.exists()) {
        return { success: false, error: "Share code not found. Check the code and try again." };
      }

      const card = snap.data() as HealthCard;
      update((p) => ({
        ...p,
        teamCards: [...p.teamCards, card],
      }));

      return { success: true };
    } catch (e) {
      console.error("Import error:", e);
      return { success: false, error: "Failed to import. Please try again." };
    }
  };

  const removeTeamCard = (code: string) => {
    update((p) => ({
      ...p,
      teamCards: p.teamCards.filter((c) => c.shareCode !== code),
    }));
  };

  // ── Derived ──
  const myAnalysisComplete = portfolio.myAnalysis ? computeIsComplete(portfolio.myAnalysis) : false;
  const myAnalysisProgress = portfolio.myAnalysis
    ? getProgress(portfolio.myAnalysis)
    : { done: 0, total: 16, percent: 0 };

  // Build constellation: own Health Card + imported team cards
  const constellationCards: HealthCard[] = [];
  if (portfolio.myAnalysis && myAnalysisComplete) {
    const a = portfolio.myAnalysis;
    constellationCards.push({
      shareCode: portfolio.shareCode || "SELF",
      ownerUID: user?.uid || "",
      ownerName: a.ownerName,
      ownerEmail: user?.email || "",
      ownerRegion: a.ownerRegion,
      businessName: a.businessName,
      businessDescription: a.businessDescription,
      color: a.color,
      businessModel: a.businessModel,
      fiveForces: a.fiveForces,
      vrio: a.vrio,
      swot: a.swot,
      industryAttractiveness: computeAttractiveness(a.fiveForces),
      competitiveStrength: computeStrength(a.vrio),
    });
  }
  constellationCards.push(...portfolio.teamCards);

  const phase2Unlocked = constellationCards.length >= 3;

  return (
    <PortfolioContext.Provider
      value={{
        portfolio,
        isLoading,
        startAnalysis,
        resetAnalysis,
        setDiagramLanguage,
        populatePillar,
        myAnalysisComplete,
        myAnalysisProgress,
        generateShareCode,
        shareCode: portfolio.shareCode,
        importShareCode,
        removeTeamCard,
        teamCards: portfolio.teamCards,
        phase2Unlocked,
        constellationCards,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used within PortfolioProvider");
  return context;
};
