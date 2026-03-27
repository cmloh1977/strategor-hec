"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/PortfolioContext";
import ChatPane from "@/components/ChatPane";
import CanvasPane from "@/components/CanvasPane";
import PortfolioDashboard from "@/components/PortfolioDashboard";

export default function JourneyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { portfolio } = usePortfolio();

  const view = searchParams.get("view") || "dashboard";
  const step = searchParams.get("step") || "business-model";

  const handleNavigate = (newView: string, newStep?: string) => {
    if (newView === "analysis" && newStep) {
      router.push(`/journey?view=analysis&step=${newStep}`);
    } else {
      router.push(`/journey?view=${newView}`);
    }
  };

  // Dashboard
  if (view === "dashboard") {
    return <PortfolioDashboard onNavigate={handleNavigate} />;
  }

  // Analysis (Phase 1 — user's single business)
  if (view === "analysis") {
    if (!portfolio.myAnalysis) {
      return (
        <div className="flex h-full items-center justify-center text-slate-400">
          <p>No analysis started. <button onClick={() => handleNavigate("dashboard")} className="text-red-500 underline">Return to Dashboard</button></p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 h-full w-full overflow-hidden">
        <div className="w-1/2 h-full border-r border-slate-200 bg-slate-50 relative">
          <CanvasPane moduleId={step} />
        </div>
        <div className="w-1/2 h-full bg-white relative">
          <ChatPane moduleId={step} />
        </div>
      </div>
    );
  }

  // Phase 2 placeholders
  if (view === "constellation" || view === "challenges" || view === "project-ideas") {
    const titles: Record<string, string> = {
      constellation: "Toyota Tsusho Constellation Map",
      challenges: "Common Challenges",
      "project-ideas": "Group Project Ideas",
    };
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{titles[view]}</h2>
          <p className="text-slate-500">Coming soon — this module will be built next.</p>
        </div>
      </div>
    );
  }

  return <PortfolioDashboard onNavigate={handleNavigate} />;
}
