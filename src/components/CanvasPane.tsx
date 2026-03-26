"use client";

import { useDiagram, type BusinessModelState } from "@/lib/DiagramContext";

const MODULE_INFO: Record<string, { title: string; description: string }> = {
  "business-model": {
    title: "Business Model",
    description: "Define the core elements of your division's current business model.",
  },
  "external-analysis": {
    title: "External Analysis",
    description: "Analyze the competitive forces shaping your industry using Porter's 5 Forces.",
  },
  "internal-analysis": {
    title: "Internal Analysis",
    description: "Evaluate your key resources and capabilities using the VRIO framework.",
  },
  "swot-synthesis": {
    title: "SWOT Synthesis",
    description: "Combine your external and internal analyses into a comprehensive SWOT.",
  },
  "strategic-options": {
    title: "Strategic Options",
    description: "Based on all preceding analyses, formulate strategic options for your division.",
  },
};


// ── Demo data for preview ────────────────────────────────────────────────────
const DEMO_DATA: Record<string, string[]> = {
  valueProposition: [
    "Japanese OEMs (Toyota, Honda) & Tier-1 suppliers",
    "Integrated supply chain for auto parts (metals, electronics)",
    "End-to-end logistics & customs across 30+ countries",
    "Commission-based (3-5%) + logistics fees",
  ],
  valueArchitecture: [
    "Sourcing → QA → Logistics → Last-mile to assembly plants",
    "Nippon Steel, carriers, SE Asia distributors",
    "50+ yrs OEM relationships, proprietary trade finance",
    "Deep Japanese manufacturing culture expertise",
  ],
  contributions: [
    "¥180B revenue, 2.3% op. margin, high capital turnover",
    "Carbon tracking, green logistics transition",
    "12,000+ jobs in emerging markets, skills transfer programs",
  ],
};

// ── Segment Card (one of the 3 pillars rendered as a colored panel) ──────────
function SegmentCard({
  title,
  subtitle,
  bgFrom,
  bgTo,
  icon,
  defaultItems,
  populatedItems,
  isPopulated,
}: {
  title: string;
  subtitle: string;
  bgFrom: string;
  bgTo: string;
  icon: string;
  defaultItems: string[];
  populatedItems: string[];
  isPopulated: boolean;
}) {
  const items = isPopulated ? populatedItems : defaultItems;
  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-500 shadow-md relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`,
        minHeight: isPopulated ? 'auto' : '120px',
      }}
    >
      {/* Populated glow effect */}
      {isPopulated && (
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div>
          <h3 className="text-white font-bold text-[14px] leading-tight drop-shadow-sm">
            {title}
          </h3>
          <p className="text-white/60 text-[10px] italic">{subtitle}</p>
        </div>
        {isPopulated && (
          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
            ✓
          </span>
        )}
      </div>

      {/* Items */}
      <ul className="space-y-1 mt-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${
              isPopulated ? "bg-white" : "bg-white/40"
            }`} />
            <span className={`text-[11px] leading-snug ${
              isPopulated 
                ? "text-white font-medium" 
                : "text-white/50 italic"
            }`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Unified Business Model Diagram ───────────────────────────────────────────
function BusinessModelDiagram() {
  const { businessModel, populateBusinessModel, resetBusinessModel } = useDiagram();
  const anyPopulated =
    businessModel.valueProposition.populated ||
    businessModel.valueArchitecture.populated ||
    businessModel.contributions.populated;

  const handleDemoToggle = () => {
    if (anyPopulated) {
      resetBusinessModel();
    } else {
      populateBusinessModel("valueProposition", DEMO_DATA.valueProposition);
      populateBusinessModel("valueArchitecture", DEMO_DATA.valueArchitecture);
      populateBusinessModel("contributions", DEMO_DATA.contributions);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* 3-panel layout matching the circular diagram shape */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Value Proposition — top left */}
        <SegmentCard
          title="Value Proposition"
          subtitle="Who? What?"
          bgFrom="#E8634A"
          bgTo="#D94E38"
          icon="🎯"
          defaultItems={["Customers", "Products and/or services", "Price"]}
          populatedItems={businessModel.valueProposition.points}
          isPopulated={businessModel.valueProposition.populated}
        />

        {/* Value Architecture — top right */}
        <SegmentCard
          title="Value Architecture"
          subtitle="How?"
          bgFrom="#1EB5C4"
          bgTo="#1A9AAD"
          icon="⚙️"
          defaultItems={["Value chain", "Partners", "Resources & competencies"]}
          populatedItems={businessModel.valueArchitecture.points}
          isPopulated={businessModel.valueArchitecture.populated}
        />
      </div>

      {/* Contributions — centered below, same size as top cards */}
      <div className="w-[calc(50%-0.375rem)] mx-auto mb-3">
        <SegmentCard
          title="Contributions"
          subtitle="How much?"
          bgFrom="#89B630"
          bgTo="#7AA525"
          icon="📊"
          defaultItems={["Environmental", "Financial", "Societal"]}
          populatedItems={businessModel.contributions.points}
          isPopulated={businessModel.contributions.populated}
        />
      </div>

      {/* Attribution + Demo toggle */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <p className="text-[10px] text-slate-400 italic">
          Odyssey 3.14 — Lehmann-Ortega, Musikas, Schoettl
        </p>
        <button
          onClick={handleDemoToggle}
          className="text-[10px] px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          {anyPopulated ? "⟲ Reset" : "▶ Preview example"}
        </button>
      </div>
    </div>
  );
}

// ── Demo data for 5 Forces ───────────────────────────────────────────────────
const DEMO_5F: Record<string, string[]> = {
  newEntrants: ["High capital requirements for integrated logistics infra", "Incumbent brand loyalty and trusting relationships"],
  suppliers: ["Consolidated supplier base (e.g., major steel mills)", "High switching costs for specialized materials"],
  rivalry: ["Intense price competition among top trading houses", "High exit barriers due to long-term OEM contracts"],
  buyers: ["Highly price-sensitive OEMs facing margin pressure", "Demand for zero-defect quality and JIT delivery"],
  substitutes: ["Emerging alternative materials (carbon fiber, bio-plastics)", "Direct-to-OEM sourcing bypassing trading houses"],
};

// ── 5 Forces Diagram ─────────────────────────────────────────────────────────
function FiveForcesPane() {
  const { fiveForces, populateFiveForces, resetFiveForces } = useDiagram();
  const anyPopulated =
    fiveForces.newEntrants.populated ||
    fiveForces.suppliers.populated ||
    fiveForces.rivalry.populated ||
    fiveForces.buyers.populated ||
    fiveForces.substitutes.populated;

  const handleDemoToggle = () => {
    if (anyPopulated) {
      resetFiveForces();
    } else {
      populateFiveForces("newEntrants", DEMO_5F.newEntrants);
      populateFiveForces("suppliers", DEMO_5F.suppliers);
      populateFiveForces("rivalry", DEMO_5F.rivalry);
      populateFiveForces("buyers", DEMO_5F.buyers);
      populateFiveForces("substitutes", DEMO_5F.substitutes);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto">
        {/* 3x3 Grid for the cross layout */}
        <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full max-w-[800px]">
          {/* Top: New Entrants */}
          <div className="col-start-2 row-start-1">
            <SegmentCard
              title="New Entrants"
              subtitle="Threat"
              bgFrom="#64748b" bgTo="#475569" icon="🚧"
              defaultItems={["Capital requirements", "Brand loyalty"]}
              populatedItems={fiveForces.newEntrants.points}
              isPopulated={fiveForces.newEntrants.populated}
            />
          </div>

          {/* Left: Suppliers */}
          <div className="col-start-1 row-start-2">
            <SegmentCard
              title="Suppliers"
              subtitle="Bargaining Power"
              bgFrom="#64748b" bgTo="#475569" icon="🏭"
              defaultItems={["Supplier concentration", "Switching costs"]}
              populatedItems={fiveForces.suppliers.points}
              isPopulated={fiveForces.suppliers.populated}
            />
          </div>

          {/* Center: Rivalry */}
          <div className="col-start-2 row-start-2 z-10 shadow-xl ring-2 ring-indigo-500/30 rounded-2xl">
            <SegmentCard
              title="Industry Rivalry"
              subtitle="Competition Intensity"
              bgFrom="#4f46e5" bgTo="#4338ca" icon="⚔️"
              defaultItems={["Competitor concentration", "Industry growth"]}
              populatedItems={fiveForces.rivalry.points}
              isPopulated={fiveForces.rivalry.populated}
            />
          </div>

          {/* Right: Buyers */}
          <div className="col-start-3 row-start-2">
            <SegmentCard
              title="Buyers"
              subtitle="Bargaining Power"
              bgFrom="#64748b" bgTo="#475569" icon="🤝"
              defaultItems={["Buyer concentration", "Price sensitivity"]}
              populatedItems={fiveForces.buyers.points}
              isPopulated={fiveForces.buyers.populated}
            />
          </div>

          {/* Bottom: Substitutes */}
          <div className="col-start-2 row-start-3">
            <SegmentCard
              title="Substitutes"
              subtitle="Threat"
              bgFrom="#64748b" bgTo="#475569" icon="🔄"
              defaultItems={["Substitute performance", "Cost of change"]}
              populatedItems={fiveForces.substitutes.points}
              isPopulated={fiveForces.substitutes.populated}
            />
          </div>
        </div>
      </div>

      {/* Attribution + Demo toggle */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">
          Porter's Five Forces — Michael E. Porter
        </p>
        <button
          onClick={handleDemoToggle}
          className="text-[10px] px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
        >
          {anyPopulated ? "⟲ Reset" : "▶ Preview example"}
        </button>
      </div>
    </div>
  );
}

// ── Demo data for VRIO ────────────────────────────────────────────────────────
const DEMO_VRIO: Record<string, string[]> = {
  valuable: ["Exclusive access to top-tier Japanese OEMs", "Proprietary global supply chain network"],
  rare: ["Deep integration into Toyota's production system", "Rare combination of trading & logistics capabilities"],
  inimitable: ["Decades of trusting relationships with partners", "Complex cross-border regulatory expertise"],
  organized: ["Dedicated mobility division structure", "Agile local teams in 30+ emerging markets"],
};

// ── VRIO Diagram ──────────────────────────────────────────────────────────────
function VRIOPane() {
  const { vrio, populateVrio, resetVrio } = useDiagram();
  const anyPopulated = vrio.valuable.populated || vrio.rare.populated || vrio.inimitable.populated || vrio.organized.populated;

  const handleDemoToggle = () => {
    if (anyPopulated) resetVrio();
    else {
      populateVrio("valuable", DEMO_VRIO.valuable);
      populateVrio("rare", DEMO_VRIO.rare);
      populateVrio("inimitable", DEMO_VRIO.inimitable);
      populateVrio("organized", DEMO_VRIO.organized);
    }
  };

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
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">VRIO Framework — Jay B. Barney</p>
        <button onClick={handleDemoToggle} className="text-[10px] px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600 transition-colors">
          {anyPopulated ? "⟲ Reset" : "▶ Preview example"}
        </button>
      </div>
    </div>
  );
}

// ── Demo data for SWOT ────────────────────────────────────────────────────────
const DEMO_SWOT: Record<string, string[]> = {
  strengths: ["Unmatched OEM relationships", "Global logistics footprint", "Financial stability"],
  weaknesses: ["Over-reliance on automotive sector", "Slower decision-making in new tech"],
  opportunities: ["EV supply chain expansion", "Battery recycling / circular economy", "Growth in African markets"],
  threats: ["Geopolitical supply chain disruptions", "Rise of Chinese EV manufacturers", "Protectionist trade policies"],
};

// ── SWOT Diagram ──────────────────────────────────────────────────────────────
function SWOTPane() {
  const { swot, populateSwot, resetSwot } = useDiagram();
  const anyPopulated = swot.strengths.populated || swot.weaknesses.populated || swot.opportunities.populated || swot.threats.populated;

  const handleDemoToggle = () => {
    if (anyPopulated) resetSwot();
    else {
      populateSwot("strengths", DEMO_SWOT.strengths);
      populateSwot("weaknesses", DEMO_SWOT.weaknesses);
      populateSwot("opportunities", DEMO_SWOT.opportunities);
      populateSwot("threats", DEMO_SWOT.threats);
    }
  };

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
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">SWOT Analysis — Albert Humphrey</p>
        <button onClick={handleDemoToggle} className="text-[10px] px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600 transition-colors">
          {anyPopulated ? "⟲ Reset" : "▶ Preview example"}
        </button>
      </div>
    </div>
  );
}

// ── Demo data for Strategic Options ───────────────────────────────────────────
const DEMO_OPT: Record<string, string[]> = {
  option1: ["Accelerate EV component supply chain dominance in SE Asia"],
  option2: ["Diversify into non-automotive mobility (e.g., aerospace, rail)"],
  option3: ["Invest heavily in battery recycling infrastructure for circular economy"],
};

// ── Strategic Options ─────────────────────────────────────────────────────────
function StrategicOptionsPane() {
  const { options, populateOptions, resetOptions } = useDiagram();
  const anyPopulated = options.option1.populated || options.option2.populated || options.option3.populated;

  const handleDemoToggle = () => {
    if (anyPopulated) resetOptions();
    else {
      populateOptions("option1", DEMO_OPT.option1);
      populateOptions("option2", DEMO_OPT.option2);
      populateOptions("option3", DEMO_OPT.option3);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 overflow-y-auto space-y-3 max-w-[800px] mx-auto w-full">
        <SegmentCard title="Option 1" subtitle="Strategic Priority" bgFrom="#475569" bgTo="#334155" icon="1️⃣"
          defaultItems={["Define your first option..."]} populatedItems={options.option1.points} isPopulated={options.option1.populated} />
        <SegmentCard title="Option 2" subtitle="Strategic Priority" bgFrom="#475569" bgTo="#334155" icon="2️⃣"
          defaultItems={["Define your second option..."]} populatedItems={options.option2.points} isPopulated={options.option2.populated} />
        <SegmentCard title="Option 3" subtitle="Strategic Priority" bgFrom="#475569" bgTo="#334155" icon="3️⃣"
          defaultItems={["Define your third option..."]} populatedItems={options.option3.points} isPopulated={options.option3.populated} />
      </div>
      <div className="flex items-center justify-end mt-auto pt-4 border-t border-slate-100">
        <button onClick={handleDemoToggle} className="text-[10px] px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600 transition-colors">
          {anyPopulated ? "⟲ Reset" : "▶ Preview example"}
        </button>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function CanvasPane({ moduleId }: { moduleId: string }) {
  const info = MODULE_INFO[moduleId] || MODULE_INFO["business-model"];

  const renderModuleContent = () => {
    switch (moduleId) {
      case "business-model": return <BusinessModelDiagram />;
      case "external-analysis": return <FiveForcesPane />;
      case "internal-analysis": return <VRIOPane />;
      case "swot-synthesis": return <SWOTPane />;
      case "strategic-options": return <StrategicOptionsPane />;
      default: return <BusinessModelDiagram />;
    }
  };

  return (
    <div className="h-full w-full p-6 flex flex-col overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {info.title}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {info.description}
        </p>
      </div>
      {renderModuleContent()}
    </div>
  );
}
