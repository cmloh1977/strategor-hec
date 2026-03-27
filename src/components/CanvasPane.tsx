"use client";

import { usePortfolio } from "@/lib/PortfolioContext";

const MODULE_INFO: Record<string, { title: string; description: string }> = {
  "business-model": {
    title: "Business Model",
    description: "Define the core elements of your business model using the Odyssey 3.14 framework.",
  },
  "external-analysis": {
    title: "External Analysis",
    description: "Analyze the competitive forces shaping your industry using Porter's 5 Forces.",
  },
  "internal-analysis": {
    title: "Internal Analysis",
    description: "Evaluate key resources and capabilities using the VRIO framework.",
  },
  "swot-synthesis": {
    title: "SWOT Synthesis",
    description: "Combine your external and internal analyses into a comprehensive SWOT.",
  },
};

// ── Segment Card ──
function SegmentCard({
  title, subtitle, bgFrom, bgTo, icon, defaultItems, populatedItems, isPopulated,
}: {
  title: string; subtitle: string; bgFrom: string; bgTo: string; icon: string;
  defaultItems: string[]; populatedItems: string[]; isPopulated: boolean;
}) {
  const items = isPopulated ? populatedItems : defaultItems;
  return (
    <div
      className="rounded-2xl p-4 transition-all duration-500 shadow-md relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`, minHeight: isPopulated ? 'auto' : '120px' }}
    >
      {isPopulated && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div>
          <h3 className="text-white font-bold text-[14px] leading-tight drop-shadow-sm">{title}</h3>
          <p className="text-white/60 text-[10px] italic">{subtitle}</p>
        </div>
        {isPopulated && (
          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">✓</span>
        )}
      </div>
      <ul className="space-y-1 mt-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${isPopulated ? "bg-white" : "bg-white/40"}`} />
            <span className={`text-[11px] leading-snug ${isPopulated ? "text-white font-medium" : "text-white/50 italic"}`}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Business Model ──
function BusinessModelDiagram() {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const bm = portfolio.myAnalysis.businessModel;

  return (
    <div className="flex flex-col flex-1">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <SegmentCard title="Value Proposition" subtitle="Who? What?" bgFrom="#E8634A" bgTo="#D94E38" icon="🎯"
          defaultItems={["Customers", "Products and/or services", "Price"]}
          populatedItems={bm.valueProposition.points} isPopulated={bm.valueProposition.populated} />
        <SegmentCard title="Value Architecture" subtitle="How?" bgFrom="#1EB5C4" bgTo="#1A9AAD" icon="⚙️"
          defaultItems={["Value chain", "Partners", "Resources & competencies"]}
          populatedItems={bm.valueArchitecture.points} isPopulated={bm.valueArchitecture.populated} />
      </div>
      <div className="w-[calc(50%-0.375rem)] mx-auto mb-3">
        <SegmentCard title="Contributions" subtitle="How much?" bgFrom="#89B630" bgTo="#7AA525" icon="📊"
          defaultItems={["Environmental", "Financial", "Societal"]}
          populatedItems={bm.contributions.points} isPopulated={bm.contributions.populated} />
      </div>
      <div className="mt-auto pt-2">
        <p className="text-[10px] text-slate-400 italic">Odyssey 3.14 — Lehmann-Ortega, Musikas, Schoettl</p>
      </div>
    </div>
  );
}

// ── 5 Forces ──
function FiveForcesPane() {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const ff = portfolio.myAnalysis.fiveForces;

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto">
        <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full max-w-[800px]">
          <div className="col-start-2 row-start-1">
            <SegmentCard title="New Entrants" subtitle="Threat" bgFrom="#64748b" bgTo="#475569" icon="🚧"
              defaultItems={["Capital requirements", "Brand loyalty"]}
              populatedItems={ff.newEntrants.points} isPopulated={ff.newEntrants.populated} />
          </div>
          <div className="col-start-1 row-start-2">
            <SegmentCard title="Suppliers" subtitle="Bargaining Power" bgFrom="#64748b" bgTo="#475569" icon="🏭"
              defaultItems={["Supplier concentration", "Switching costs"]}
              populatedItems={ff.suppliers.points} isPopulated={ff.suppliers.populated} />
          </div>
          <div className="col-start-2 row-start-2 z-10 shadow-xl ring-2 ring-indigo-500/30 rounded-2xl">
            <SegmentCard title="Industry Rivalry" subtitle="Competition Intensity" bgFrom="#4f46e5" bgTo="#4338ca" icon="⚔️"
              defaultItems={["Competitor concentration", "Industry growth"]}
              populatedItems={ff.rivalry.points} isPopulated={ff.rivalry.populated} />
          </div>
          <div className="col-start-3 row-start-2">
            <SegmentCard title="Buyers" subtitle="Bargaining Power" bgFrom="#64748b" bgTo="#475569" icon="🤝"
              defaultItems={["Buyer concentration", "Price sensitivity"]}
              populatedItems={ff.buyers.points} isPopulated={ff.buyers.populated} />
          </div>
          <div className="col-start-2 row-start-3">
            <SegmentCard title="Substitutes" subtitle="Threat" bgFrom="#64748b" bgTo="#475569" icon="🔄"
              defaultItems={["Substitute performance", "Cost of change"]}
              populatedItems={ff.substitutes.points} isPopulated={ff.substitutes.populated} />
          </div>
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">Porter's Five Forces — Michael E. Porter</p>
      </div>
    </div>
  );
}

// ── VRIO ──
function VRIOPane() {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const vrio = portfolio.myAnalysis.vrio;

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-[800px] mx-auto">
          <SegmentCard title="Valuable" subtitle="Is it?" bgFrom="#10b981" bgTo="#059669" icon="💎"
            defaultItems={["Do you offer value?"]} populatedItems={vrio.valuable.points} isPopulated={vrio.valuable.populated} />
          <SegmentCard title="Rare" subtitle="Is it?" bgFrom="#f59e0b" bgTo="#d97706" icon="🦄"
            defaultItems={["Do many others have it?"]} populatedItems={vrio.rare.points} isPopulated={vrio.rare.populated} />
          <SegmentCard title="Inimitable" subtitle="Is it costly to copy?" bgFrom="#ef4444" bgTo="#dc2626" icon="🛡️"
            defaultItems={["Can it be easily copied?"]} populatedItems={vrio.inimitable.points} isPopulated={vrio.inimitable.populated} />
          <SegmentCard title="Organized" subtitle="Are you?" bgFrom="#6366f1" bgTo="#4f46e5" icon="🧩"
            defaultItems={["Is the firm organized to exploit it?"]} populatedItems={vrio.organized.points} isPopulated={vrio.organized.populated} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">VRIO Framework — Jay B. Barney</p>
      </div>
    </div>
  );
}

// ── SWOT ──
function SWOTPane() {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const swot = portfolio.myAnalysis.swot;

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-[800px] mx-auto">
          <SegmentCard title="Strengths" subtitle="Internal Positive" bgFrom="#0d9488" bgTo="#0f766e" icon="💪"
            defaultItems={["What do you do well?"]} populatedItems={swot.strengths.points} isPopulated={swot.strengths.populated} />
          <SegmentCard title="Weaknesses" subtitle="Internal Negative" bgFrom="#be123c" bgTo="#9f1239" icon="⚠️"
            defaultItems={["Where do you lack resources?"]} populatedItems={swot.weaknesses.points} isPopulated={swot.weaknesses.populated} />
          <SegmentCard title="Opportunities" subtitle="External Positive" bgFrom="#0284c7" bgTo="#0369a1" icon="🚀"
            defaultItems={["What trends can you leverage?"]} populatedItems={swot.opportunities.points} isPopulated={swot.opportunities.populated} />
          <SegmentCard title="Threats" subtitle="External Negative" bgFrom="#b45309" bgTo="#92400e" icon="⚡"
            defaultItems={["What could harm you?"]} populatedItems={swot.threats.points} isPopulated={swot.threats.populated} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">SWOT Analysis — Albert Humphrey</p>
      </div>
    </div>
  );
}

// ── Main Export ──
export default function CanvasPane({ moduleId }: { moduleId: string }) {
  const { portfolio } = usePortfolio();
  const info = MODULE_INFO[moduleId] || MODULE_INFO["business-model"];

  const renderModuleContent = () => {
    switch (moduleId) {
      case "business-model": return <BusinessModelDiagram />;
      case "external-analysis": return <FiveForcesPane />;
      case "internal-analysis": return <VRIOPane />;
      case "swot-synthesis": return <SWOTPane />;
      default: return <BusinessModelDiagram />;
    }
  };

  return (
    <div className="h-full w-full p-6 flex flex-col overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="mb-3">
        {portfolio.myAnalysis && (
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full" style={{ background: portfolio.myAnalysis.color }} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{portfolio.myAnalysis.businessName}</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{info.title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{info.description}</p>
      </div>
      {renderModuleContent()}
    </div>
  );
}
