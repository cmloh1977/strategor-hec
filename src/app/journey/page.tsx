"use client";

import { useSearchParams } from "next/navigation";
import ChatPane from "@/components/ChatPane";
import CanvasPane from "@/components/CanvasPane";

export default function JourneyPage() {
  const searchParams = useSearchParams();
  const activeModule = searchParams.get("module") || "business-model";

  return (
    <div className="flex flex-1 h-full w-full overflow-hidden">
      {/* Left Pane: The Strategic Framework Diagram */}
      <div className="w-1/2 h-full border-r border-slate-200 bg-slate-50 relative">
        <CanvasPane moduleId={activeModule} />
      </div>
      
      {/* Right Pane: The AI Coach Chat */}
      <div className="w-1/2 h-full bg-white relative">
        <ChatPane moduleId={activeModule} />
      </div>
    </div>
  );
}
