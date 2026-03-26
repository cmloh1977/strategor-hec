"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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

interface DiagramContextType {
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
  
  resetBusinessModel: () => void;
  resetFiveForces: () => void;
  resetVrio: () => void;
  resetSwot: () => void;
  resetOptions: () => void;
}

// ── Initial States ──

const emptyPillar: PillarData = { points: [], populated: false };

const INIT_BM: BusinessModelState = {
  valueProposition: emptyPillar,
  valueArchitecture: emptyPillar,
  contributions: emptyPillar,
};

const INIT_5F: FiveForcesState = {
  newEntrants: emptyPillar,
  suppliers: emptyPillar,
  rivalry: emptyPillar,
  buyers: emptyPillar,
  substitutes: emptyPillar,
};

const INIT_VRIO: VrioState = {
  valuable: emptyPillar,
  rare: emptyPillar,
  inimitable: emptyPillar,
  organized: emptyPillar,
};

const INIT_SWOT: SwotState = {
  strengths: emptyPillar,
  weaknesses: emptyPillar,
  opportunities: emptyPillar,
  threats: emptyPillar,
};

const INIT_OPT: StrategicOptionsState = {
  option1: emptyPillar,
  option2: emptyPillar,
  option3: emptyPillar,
};

// ── localStorage helpers ──

const STORAGE_KEY = "strategor_diagram_state";

function loadFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveToStorage(data: object) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ── Context Creation ──

const DiagramContext = createContext<DiagramContextType | null>(null);

export function DiagramProvider({ children }: { children: ReactNode }) {
  const [businessModel, setBusinessModel] = useState<BusinessModelState>(INIT_BM);
  const [fiveForces, setFiveForces] = useState<FiveForcesState>(INIT_5F);
  const [vrio, setVrio] = useState<VrioState>(INIT_VRIO);
  const [swot, setSwot] = useState<SwotState>(INIT_SWOT);
  const [options, setOptions] = useState<StrategicOptionsState>(INIT_OPT);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      if (saved.businessModel) setBusinessModel(saved.businessModel);
      if (saved.fiveForces) setFiveForces(saved.fiveForces);
      if (saved.vrio) setVrio(saved.vrio);
      if (saved.swot) setSwot(saved.swot);
      if (saved.options) setOptions(saved.options);
    }
  }, []);

  // Persist to localStorage whenever any state changes
  const persist = useCallback(() => {
    saveToStorage({ businessModel, fiveForces, vrio, swot, options });
  }, [businessModel, fiveForces, vrio, swot, options]);

  useEffect(() => {
    persist();
  }, [persist]);

  const populateBusinessModel = (p: keyof BusinessModelState, pts: string[]) => {
    setBusinessModel(prev => ({ ...prev, [p]: { points: pts, populated: true } }));
  };
  const populateFiveForces = (p: keyof FiveForcesState, pts: string[]) => {
    setFiveForces(prev => ({ ...prev, [p]: { points: pts, populated: true } }));
  };
  const populateVrio = (p: keyof VrioState, pts: string[]) => {
    setVrio(prev => ({ ...prev, [p]: { points: pts, populated: true } }));
  };
  const populateSwot = (p: keyof SwotState, pts: string[]) => {
    setSwot(prev => ({ ...prev, [p]: { points: pts, populated: true } }));
  };
  const populateOptions = (p: keyof StrategicOptionsState, pts: string[]) => {
    setOptions(prev => ({ ...prev, [p]: { points: pts, populated: true } }));
  };

  return (
    <DiagramContext.Provider value={{
      businessModel, fiveForces, vrio, swot, options,
      populateBusinessModel, populateFiveForces, populateVrio, populateSwot, populateOptions,
      resetBusinessModel: () => setBusinessModel(INIT_BM),
      resetFiveForces: () => setFiveForces(INIT_5F),
      resetVrio: () => setVrio(INIT_VRIO),
      resetSwot: () => setSwot(INIT_SWOT),
      resetOptions: () => setOptions(INIT_OPT),
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

