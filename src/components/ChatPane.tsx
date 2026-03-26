"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { useDiagram } from "@/lib/DiagramContext";

interface Message {
  id: string;
  role: "user" | "coach";
  text: string;
}

const PILLAR_DEF: Record<string, {
  name: string;
  emoji: string;
  module: "businessModel" | "fiveForces" | "vrio" | "swot" | "options";
}> = {
  // Business Model
  valueProposition: { name: "Value Proposition", emoji: "🎯", module: "businessModel" },
  valueArchitecture: { name: "Value Architecture", emoji: "⚙️", module: "businessModel" },
  contributions: { name: "Contributions", emoji: "📊", module: "businessModel" },

  // 5 Forces
  newEntrants: { name: "New Entrants", emoji: "🚧", module: "fiveForces" },
  suppliers: { name: "Suppliers", emoji: "🏭", module: "fiveForces" },
  rivalry: { name: "Industry Rivalry", emoji: "⚔️", module: "fiveForces" },
  buyers: { name: "Buyers", emoji: "🤝", module: "fiveForces" },
  substitutes: { name: "Substitutes", emoji: "🔄", module: "fiveForces" },

  // VRIO
  valuable: { name: "Valuable", emoji: "💎", module: "vrio" },
  rare: { name: "Rare", emoji: "🦄", module: "vrio" },
  inimitable: { name: "Inimitable", emoji: "🛡️", module: "vrio" },
  organized: { name: "Organized", emoji: "🧩", module: "vrio" },

  // SWOT
  strengths: { name: "Strengths", emoji: "💪", module: "swot" },
  weaknesses: { name: "Weaknesses", emoji: "⚠️", module: "swot" },
  opportunities: { name: "Opportunities", emoji: "🚀", module: "swot" },
  threats: { name: "Threats", emoji: "⚡", module: "swot" },

  // Options
  option1: { name: "Option 1", emoji: "1️⃣", module: "options" },
  option2: { name: "Option 2", emoji: "2️⃣", module: "options" },
  option3: { name: "Option 3", emoji: "3️⃣", module: "options" },
};

// ── Detect if a message contains a populate command ─────────────────────────
function parsePopulateCommand(text: string): {
  pillar: string | null;
  points: string[];
  cleanText: string;
} {
  // Match pattern: [POPULATE:pillarName]
  const match = text.match(/\[POPULATE:([a-zA-Z0-9]+)\]/i);
  if (!match) return { pillar: null, points: [], cleanText: text };

  const pillar = match[1];
  if (!PILLAR_DEF[pillar]) return { pillar: null, points: [], cleanText: text };

  // Isolate the text between [POPULATE:pillar] and [/POPULATE] (if present)
  const afterMarker = text.substring(text.indexOf(match[0]) + match[0].length);
  let relevantBlock = afterMarker;
  const closingIdx = afterMarker.indexOf('[/POPULATE]');
  
  if (closingIdx !== -1) {
    relevantBlock = afterMarker.substring(0, closingIdx);
  } else {
    // Fallback: Stop when we hit a line that doesn't start with a bullet point or is empty
    // But for safety, we just take the first few non-empty lines that look like bullets
  }

  const points = relevantBlock
    .split('\n')
    .map(line => line.trim())
    // Require lines inside the block to actually be bullet points or text, stripping the bullets
    .map(line => line.replace(/^[\s•\-*]+/, '').trim())
    .filter(line => line.length > 0 && line.length < 200);

  // Remove both markers from the displayed text
  let cleanText = text.replace(match[0], '').trim();
  cleanText = cleanText.replace(/\[\/POPULATE\]/gi, '').trim();

  return { pillar, points: points.slice(0, 8), cleanText };
}

const MODULE_GREETINGS: Record<string, string> = {
  "business-model": "Welcome! I'm your **Thinking Partner**. Before we dive into any analysis, let's first build a crystal-clear picture of your chosen business model.\n\nOn the left, you can see the **3 pillars** from the Odyssey 3.14 framework that define any business model:\n\n- 🎯 **Value Proposition** — *Who* are your customers? *What* products/services do you offer? At *what price*?\n- ⚙️ **Value Architecture** — *How* do you deliver that value? What's your value chain, who are your partners, what resources and competencies do you rely on?\n- 📊 **Contributions** — What is the resulting performance? *Financial, environmental, and societal.*\n\nLet's start with the first pillar. Tell me: **Which company or business unit are you analyzing**, and what does it fundamentally do?",
  "external-analysis": "Welcome back. Now let's shift our lens **outward**.\n\nWe'll use **Porter's 5 Forces** framework to map the competitive forces shaping your industry.\n\nIn broad terms, *which industry does your chosen company operate in?*",
  "internal-analysis": "Good to see you again. Now let's look **inward**.\n\nWe'll apply the **VRIO framework** to evaluate your company's key resources and capabilities.\n\n*What do you believe is your company's single most important resource or capability?*",
  "swot-synthesis": "Welcome to the **Synthesis** phase. It's time to bring everything together.\n\nBased on your external and internal analyses, let's construct a comprehensive **SWOT**.\n\n*What stood out to you most from your previous work?*",
  "strategic-options": "This is the **final stretch**. With your SWOT complete, it's time to formulate strategic options aligned with the company's *Long-Term Strategic Vision*.\n\n**What is the single biggest opportunity you identified?**",
};

export default function ChatPane({ moduleId }: { moduleId: string }) {
  const { 
    populateBusinessModel, populateFiveForces, populateVrio, populateSwot, populateOptions 
  } = useDiagram();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "coach",
      text: MODULE_GREETINGS[moduleId] || MODULE_GREETINGS["business-model"],
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingPopulate, setPendingPopulate] = useState<{
    pillar: string;
    points: string[];
    messageId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, pendingPopulate]);

  const sendMessage = async (text: string) => {
    const userMessage: Message = { id: Date.now().toString(), role: "user", text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, moduleId }),
      });
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      // Check if the AI response contains a populate command
      const { pillar, points, cleanText } = parsePopulateCommand(data.text);
      
      const cleanMessage = { ...data, text: cleanText };
      setMessages((prev) => [...prev, cleanMessage]);

      if (pillar && points.length > 0) {
        setPendingPopulate({ pillar, points, messageId: cleanMessage.id });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "coach", text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    await sendMessage(currentInput);
  };

  const handleConfirmPopulate = async () => {
    if (pendingPopulate) {
      const def = PILLAR_DEF[pendingPopulate.pillar];
      if (def) {
        if (def.module === "businessModel") populateBusinessModel(pendingPopulate.pillar as any, pendingPopulate.points);
        if (def.module === "fiveForces") populateFiveForces(pendingPopulate.pillar as any, pendingPopulate.points);
        if (def.module === "vrio") populateVrio(pendingPopulate.pillar as any, pendingPopulate.points);
        if (def.module === "swot") populateSwot(pendingPopulate.pillar as any, pendingPopulate.points);
        if (def.module === "options") populateOptions(pendingPopulate.pillar as any, pendingPopulate.points);
      }
      
      const pillarName = def ? def.name : pendingPopulate.pillar;
      setPendingPopulate(null);
      
      await sendMessage(`(System Note: The diagram has been successfully updated with the key points for ${pillarName}. The user is ready to proceed. Please ask your questions for the next segment.)`);
    }
  };

  const handleDeclinePopulate = () => {
    setPendingPopulate(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200 bg-white shadow-sm">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white mr-4 shadow-md">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Thinking Partner</h2>
          <p className="text-xs text-slate-500">Active — {moduleId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "coach" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white mr-3 mt-1 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div className={clsx(
              "max-w-[80%] rounded-2xl shadow-sm",
              msg.role === "coach"
                ? "bg-white text-slate-800 border border-slate-100 rounded-tl-sm px-5 py-4"
                : "bg-gradient-to-br from-red-500 to-red-600 text-white rounded-tr-sm px-5 py-3"
            )}>
              {msg.role === "coach" ? (
                <div className="prose prose-sm prose-slate max-w-none
                  prose-p:my-1.5 prose-p:leading-relaxed
                  prose-strong:text-slate-900 prose-strong:font-bold
                  prose-em:text-red-600 prose-em:font-medium prose-em:not-italic
                  prose-ul:my-2 prose-ul:space-y-1
                  prose-li:my-0 prose-li:marker:text-red-400
                  prose-headings:text-slate-900 prose-headings:mt-3 prose-headings:mb-1
                  prose-h3:text-sm prose-h3:font-bold
                  prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline
                ">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.text}</p>
              )}
            </div>

            {msg.role === "user" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 ml-3 mt-1">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Populate confirmation banner */}
        {pendingPopulate && (
          <div className="mx-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{PILLAR_DEF[pendingPopulate.pillar]?.emoji}</span>
              <p className="font-semibold text-emerald-800 text-sm">
                Ready to populate: {PILLAR_DEF[pendingPopulate.pillar]?.name}
              </p>
            </div>
            <ul className="text-xs text-emerald-700 space-y-1 mb-3 ml-7">
              {pendingPopulate.points.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
            <div className="flex gap-2 ml-7">
              <button
                onClick={handleConfirmPopulate}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                ✓ Yes, populate diagram
              </button>
              <button
                onClick={handleDeclinePopulate}
                className="px-4 py-1.5 rounded-lg bg-white text-slate-600 text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Not yet, refine more
              </button>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white mr-3 mt-1 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-5 py-4 rounded-2xl shadow-sm bg-white border border-slate-100 rounded-tl-sm flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="relative flex items-end mx-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share your analysis or ask a question..."
            className="w-full max-h-64 min-h-[80px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-14 text-sm outline-none resize-none transition-all focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-1.5 h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white transition-all hover:from-red-600 hover:to-red-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400">Shift + Enter for new line · Your Thinking Partner will guide you deeper</p>
        </div>
      </div>
    </div>
  );
}
