"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

export interface PillarData {
  points: string[];
  populated: boolean;
}

// ── Shared State Interfaces ──

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

export interface StrategicOptionsState {
  option1: PillarData;
  option2: PillarData;
  option3: PillarData;
}

// ── Context Types ──

export interface DiagramContextType {
  businessModel: BusinessModelState;
  fiveForces: FiveForcesState;
  vrio: VrioState;
  swot: SwotState;
  options: StrategicOptionsState;

  populateBusinessModel: (p: keyof BusinessModelState, pts: string[]) => void;
  populateFiveForces: (p: keyof FiveForcesState, pts: string[]) => void;
  populateVrio: (p: keyof VrioState, pts: string[]) => void;
  populateSwot: (p: keyof SwotState, pts: string[]) => void;
  populateOptions: (p: keyof StrategicOptionsState, pts: string[]) => void;
  isLoading: boolean;
}

// ── Initial States ──

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
const INIT_OPT: StrategicOptionsState = {
  option1: emptyPillar, option2: emptyPillar, option3: emptyPillar,
};

// ── Context Creation ──

const DiagramContext = createContext<DiagramContextType | null>(null);

export function DiagramProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [businessModel, setBusinessModel] = useState<BusinessModelState>(INIT_BM);
  const [fiveForces, setFiveForces] = useState<FiveForcesState>(INIT_5F);
  const [vrio, setVrio] = useState<VrioState>(INIT_VRIO);
  const [swot, setSwot] = useState<SwotState>(INIT_SWOT);
  const [options, setOptions] = useState<StrategicOptionsState>(INIT_OPT);

  const [isLoading, setIsLoading] = useState(true);

  // Sync state to Firebase
  const syncToFirebase = async (data: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "analysis", "current"), data, { merge: true });
    } catch (error) {
      console.error("Error syncing to Firebase:", error);
    }
  };

  // Load state from Firebase
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid, "analysis", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.businessModel) setBusinessModel(d.businessModel as BusinessModelState);
        if (d.fiveForces) setFiveForces(d.fiveForces as FiveForcesState);
        if (d.vrio) setVrio(d.vrio as VrioState);
        if (d.swot) setSwot(d.swot as SwotState);
        if (d.options) setOptions(d.options as StrategicOptionsState);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to Firebase:", error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user]);

  const populateBusinessModel = (p: keyof BusinessModelState, pts: string[]) => {
    const updated = { ...businessModel, [p]: { points: pts, populated: true } };
    setBusinessModel(updated);
    syncToFirebase({ businessModel: updated });
  };
  const populateFiveForces = (p: keyof FiveForcesState, pts: string[]) => {
    const updated = { ...fiveForces, [p]: { points: pts, populated: true } };
    setFiveForces(updated);
    syncToFirebase({ fiveForces: updated });
  };
  const populateVrio = (p: keyof VrioState, pts: string[]) => {
    const updated = { ...vrio, [p]: { points: pts, populated: true } };
    setVrio(updated);
    syncToFirebase({ vrio: updated });
  };
  const populateSwot = (p: keyof SwotState, pts: string[]) => {
    const updated = { ...swot, [p]: { points: pts, populated: true } };
    setSwot(updated);
    syncToFirebase({ swot: updated });
  };
  const populateOptions = (p: keyof StrategicOptionsState, pts: string[]) => {
    const updated = { ...options, [p]: { points: pts, populated: true } };
    setOptions(updated);
    syncToFirebase({ options: updated });
  };

  return (
    <DiagramContext.Provider value={{
      businessModel, fiveForces, vrio, swot, options,
      populateBusinessModel, populateFiveForces, populateVrio, populateSwot, populateOptions,
      isLoading
    }}>
      {children}
    </DiagramContext.Provider>
  );
}

export const useDiagram = () => {
  const context = useContext(DiagramContext);
  if (!context) throw new Error("useDiagram must be used within DiagramProvider");
  return context;
};

