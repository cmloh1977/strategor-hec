"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/PortfolioContext";
import ChatPane from "@/components/ChatPane";
import CanvasPane from "@/components/CanvasPane";
import PortfolioDashboard from "@/components/PortfolioDashboard";
// ConstellationView removed for HEC v11 — replaced by Innovation Directions module
// import ConstellationView from "@/components/ConstellationView";

export default function JourneyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { portfolio, isLoading } = usePortfolio();

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
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-red-500" />
        </div>
      );
    }
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

  // Constellation removed for HEC v11 — innovation is now handled as a module step

  return <PortfolioDashboard onNavigate={handleNavigate} />;
}
