"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, CheckCircle2, ArrowRight } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { usePortfolio } from "@/lib/PortfolioContext";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

// Maps moduleId (URL step) → which portfolio key to check
const MODULE_PILLAR_MAP: Record<string, { key: string; pillars: string[] }> = {
  "business-model": { key: "businessModel", pillars: ["valueProposition", "valueArchitecture", "contributions"] },
  "external-analysis": { key: "fiveForces", pillars: ["newEntrants", "suppliers", "rivalry", "buyers", "substitutes"] },
  "internal-analysis": { key: "vrio", pillars: ["valuable", "rare", "inimitable", "organized"] },
  "swot-synthesis": { key: "swot", pillars: ["strengths", "weaknesses", "opportunities", "threats"] },
};

// The order of steps and what comes next
const STEP_ORDER = ["business-model", "external-analysis", "internal-analysis", "swot-synthesis"];
const STEP_NAMES: Record<string, string> = {
  "business-model": "Business Model",
  "external-analysis": "External Analysis (5 Forces)",
  "internal-analysis": "Internal Analysis (VRIO)",
  "swot-synthesis": "SWOT Synthesis",
};

interface Message {
  id: string;
  role: "user" | "coach";
  text: string;
}

const PILLAR_DEF: Record<string, {
  name: string;
  emoji: string;
  module: "businessModel" | "fiveForces" | "vrio" | "swot";
}> = {
  valueProposition: { name: "Value Proposition", emoji: "🎯", module: "businessModel" },
  valueArchitecture: { name: "Value Architecture", emoji: "⚙️", module: "businessModel" },
  contributions: { name: "Contributions", emoji: "📊", module: "businessModel" },
  newEntrants: { name: "New Entrants", emoji: "🚧", module: "fiveForces" },
  suppliers: { name: "Suppliers", emoji: "🏭", module: "fiveForces" },
  rivalry: { name: "Industry Rivalry", emoji: "⚔️", module: "fiveForces" },
  buyers: { name: "Buyers", emoji: "🤝", module: "fiveForces" },
  substitutes: { name: "Substitutes", emoji: "🔄", module: "fiveForces" },
  valuable: { name: "Valuable", emoji: "💎", module: "vrio" },
  rare: { name: "Rare", emoji: "🦄", module: "vrio" },
  inimitable: { name: "Inimitable", emoji: "🛡️", module: "vrio" },
  organized: { name: "Organized", emoji: "🧩", module: "vrio" },
  strengths: { name: "Strengths", emoji: "💪", module: "swot" },
  weaknesses: { name: "Weaknesses", emoji: "⚠️", module: "swot" },
  opportunities: { name: "Opportunities", emoji: "🚀", module: "swot" },
  threats: { name: "Threats", emoji: "⚡", module: "swot" },
};

function parsePopulateCommand(text: string): { pillar: string | null; points: string[]; cleanText: string } {
  const match = text.match(/\[POPULATE:([a-zA-Z0-9]+)\]/i);
  if (!match) return { pillar: null, points: [], cleanText: text };
  const pillar = match[1];
  if (!PILLAR_DEF[pillar]) return { pillar: null, points: [], cleanText: text };

  const afterMarker = text.substring(text.indexOf(match[0]) + match[0].length);
  let relevantBlock = afterMarker;
  const closingIdx = afterMarker.indexOf('[/POPULATE]');
  if (closingIdx !== -1) relevantBlock = afterMarker.substring(0, closingIdx);

  const points = relevantBlock.split('\n').map(l => l.trim()).map(l => l.replace(/^[\s•\-*]+/, '').trim()).filter(l => l.length > 0 && l.length < 200);
  let cleanText = text.replace(match[0], '').replace(/\[\/POPULATE\]/gi, '').trim();
  return { pillar, points: points.slice(0, 8), cleanText };
}

function getGreeting(moduleId: string, bizName: string, lang?: string): string {
  const name = bizName || "your business";
  if (lang === "ja") {
    switch (moduleId) {
      case "business-model":
        return `**GALPストラテジージャーニー**へようこそ！私はあなたの**シンキングパートナー**です。\n\n**${name}**のビジネスモデルを一緒に明確にしましょう。\n\n左側にOdyssey 3.14フレームワークの**3つの柱**が表示されています：\n\n- 🎯 **価値提案** — *誰が*顧客か？*何の*製品・サービスか？*どんな価格*か？\n- ⚙️ **価値アーキテクチャ** — *どのように*価値を提供するか？バリューチェーン、パートナー、資源は？\n- 📊 **貢献** — 財務・環境・社会的パフォーマンス\n\nでは始めましょう：**${name}は基本的に何をしており、主な顧客は誰ですか？**`;
      case "external-analysis":
        return `お帰りなさい。次は**${name}**の**外部環境**に目を向けましょう。\n\n**ポーターの5つの力**を使って競争環境を分析します。\n\n*${name}はどの産業で事業を展開していますか？*`;
      case "internal-analysis":
        return `再びお会いできて嬉しいです。**${name}**の**内部**を見てみましょう。\n\n**VRIOフレームワーク**を使って主要な資源を評価します。\n\n*${name}の最も重要な資源や能力は何だと思いますか？*`;
      case "swot-synthesis":
        return `**${name}**のすべてを**統合**する時です。\n\n5つの力とVRIOの分析に基づいて、包括的な**SWOT**を構築しましょう。\n\n*これまでの分析で最も印象に残ったことは何ですか？*`;
      default: return `**${name}**の分析を続けましょう。`;
    }
  }
  if (lang === "fr") {
    switch (moduleId) {
      case "business-model":
        return `Bienvenue dans le **Parcours Stratégique GALP** ! Je suis votre **Partenaire de Réflexion**.\n\nConstruisons ensemble une image claire du modèle d'affaires de **${name}**.\n\nSur la gauche, vous voyez les **3 piliers** du framework Odyssey 3.14 :\n\n- 🎯 **Proposition de Valeur** — *Qui* sont vos clients ? *Quels* produits/services ? *Quel prix* ?\n- ⚙️ **Architecture de Valeur** — *Comment* livrez-vous de la valeur ? Chaîne de valeur, partenaires, ressources ?\n- 📊 **Contributions** — Performance financière, environnementale et sociétale.\n\nCommençons : **Que fait fondamentalement ${name}, et qui sont ses principaux clients ?**`;
      case "external-analysis":
        return `Bienvenue. Tournons notre regard vers **l'extérieur** pour **${name}**.\n\nNous utiliserons les **5 Forces de Porter** pour cartographier la dynamique concurrentielle.\n\n*Dans quel secteur opère ${name} ?*`;
      case "internal-analysis":
        return `Ravi de vous revoir. Regardons **l'intérieur** de **${name}**.\n\nNous utiliserons le **framework VRIO** pour évaluer les ressources clés.\n\n*Quelle est la ressource ou capacité la plus importante de ${name} selon vous ?*`;
      case "swot-synthesis":
        return `Il est temps de **synthétiser** tout pour **${name}**.\n\nÀ partir de vos analyses 5 Forces et VRIO, construisons un **SWOT** complet.\n\n*Qu'est-ce qui vous a le plus marqué dans vos analyses précédentes ?*`;
      default: return `Continuons l'analyse de **${name}**.`;
    }
  }
  if (lang === "zh") {
    switch (moduleId) {
      case "business-model":
        return `欢迎来到**GALP战略之旅**！我是你的**思维伙伴**。\n\n让我们一起清晰地描绘**${name}**的商业模式。\n\n在左边，您可以看到Odyssey 3.14框架的**3个支柱**：\n\n- 🎯 **价值主张** — *谁*是客户？*什么*产品/服务？*什么价格*？\n- ⚙️ **价值架构** — *如何*交付价值？价值链、合作伙伴、资源？\n- 📊 **贡献** — 财务、环境和社会绩效\n\n让我们开始吧：**${name}从根本上做什么，主要客户是谁？**`;
      case "external-analysis":
        return `欢迎回来。现在让我们将目光转向**${name}**的**外部环境**。\n\n我们将使用**波特五力模型**来分析竞争格局。\n\n*${name}在哪个行业运营？*`;
      case "internal-analysis":
        return `很高兴再次见到你。让我们审视**${name}**的**内部**。\n\n我们将使用**VRIO框架**来评估关键资源。\n\n*您认为${name}最重要的资源或能力是什么？*`;
      case "swot-synthesis":
        return `是时候为**${name}****综合**所有内容了。\n\n根据您的五力和VRIO分析，让我们构建全面的**SWOT**。\n\n*在之前的分析中，什么给您留下了最深刻的印象？*`;
      default: return `让我们继续分析**${name}**。`;
    }
  }
  // Default: English
  switch (moduleId) {
    case "business-model":
      return `Welcome to the **GALP Strategy Journey**! I'm your **Thinking Partner**.\n\nLet's build a crystal-clear picture of **${name}**'s business model.\n\nOn the left, you can see the **3 pillars** from the Odyssey 3.14 framework:\n\n- 🎯 **Value Proposition** — *Who* are your customers? *What* products/services? At *what price*?\n- ⚙️ **Value Architecture** — *How* do you deliver value? Value chain, partners, resources?\n- 📊 **Contributions** — Financial, environmental, and societal performance.\n\nLet's start: **What does ${name} fundamentally do, and who are its primary customers?**`;
    case "external-analysis":
      return `Welcome back. Now let's shift our lens **outward** for **${name}**.\n\nWe'll use **Porter's 5 Forces** to map the competitive dynamics.\n\n*In broad terms, which industry does ${name} operate in?*`;
    case "internal-analysis":
      return `Good to see you again. Let's look **inward** at **${name}**.\n\nWe'll use the **VRIO framework** to evaluate key resources.\n\n*What do you believe is ${name}'s single most important resource or capability?*`;
    case "swot-synthesis":
      return `Time to **synthesize** everything for **${name}**.\n\nBased on your 5 Forces and VRIO work, let's build a comprehensive **SWOT**.\n\n*What stood out most from your previous analyses?*`;
    default:
      return `Let's continue analyzing **${name}**.`;
  }
}

export default function ChatPane({ moduleId }: { moduleId: string }) {
  const { user } = useAuth();
  const { portfolio, populatePillar } = usePortfolio();
  const router = useRouter();
  const bizName = portfolio.myAnalysis?.businessName || "My Business";

  const chatLang = portfolio.myAnalysis?.chatLanguage || "en";

  const chatDocId = moduleId;

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "coach", text: getGreeting(moduleId, bizName, chatLang) }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingPopulate, setPendingPopulate] = useState<{ pillar: string; points: string[]; messageId: string } | null>(null);
  const [transitioning, setTransitioning] = useState<{ nextStep: string; nextStepName: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, pendingPopulate]);

  // Load chat from Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid, "chats", chatDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.messages && data.messages.length > 0) setMessages(data.messages);
      }
    });
    return () => unsub();
  }, [user, chatDocId]);

  const saveToFirestore = async (newMessages: Message[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "chats", chatDocId), { messages: newMessages }, { merge: true });
    } catch (e) {
      console.error("Error saving chat:", e);
    }
  };

  const sendMessage = async (text: string) => {
    const userMessage: Message = { id: Date.now().toString(), role: "user", text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);
    await saveToFirestore(updatedMessages);

    try {
      const diagramState = portfolio.myAnalysis ? {
        businessModel: portfolio.myAnalysis.businessModel,
        fiveForces: portfolio.myAnalysis.fiveForces,
        vrio: portfolio.myAnalysis.vrio,
        swot: portfolio.myAnalysis.swot,
      } : {};

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          moduleId,
          diagramState,
          businessName: bizName,
          chatLanguage: portfolio.myAnalysis?.chatLanguage || "en",
          difficultyLevel: portfolio.myAnalysis?.difficultyLevel || "masters",
        }),
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      const { pillar, points, cleanText } = parsePopulateCommand(data.text);
      const cleanMessage = { ...data, text: cleanText };
      const finalMessages = [...updatedMessages, cleanMessage];
      setMessages(finalMessages);
      await saveToFirestore(finalMessages);

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
        populatePillar(def.module, pendingPopulate.pillar, pendingPopulate.points);
      }
      const pillarName = def ? def.name : pendingPopulate.pillar;
      setPendingPopulate(null);

      // Check if the current module is now FULLY populated
      const moduleInfo = MODULE_PILLAR_MAP[moduleId];
      if (moduleInfo && portfolio.myAnalysis) {
        const moduleData = (portfolio.myAnalysis as any)[moduleInfo.key];
        // Count how many pillars are already populated (before this one)
        const alreadyDone = moduleInfo.pillars.filter(p => moduleData[p]?.populated).length;
        // The pillar we just populated counts as done too
        const justPopulated = moduleInfo.pillars.includes(pendingPopulate.pillar) ? 1 : 0;
        const totalDone = alreadyDone + (moduleData[pendingPopulate.pillar]?.populated ? 0 : justPopulated);

        if (totalDone >= moduleInfo.pillars.length) {
          // Module complete! Find next step
          const currentIdx = STEP_ORDER.indexOf(moduleId);
          if (currentIdx < STEP_ORDER.length - 1) {
            const nextStep = STEP_ORDER[currentIdx + 1];
            setTransitioning({ nextStep, nextStepName: STEP_NAMES[nextStep] });
            setTimeout(() => {
              router.push(`/journey?view=analysis&step=${nextStep}`);
              setTransitioning(null);
            }, 2500);
          } else {
            // Last module complete — go to dashboard
            setTransitioning({ nextStep: "dashboard", nextStepName: "Strategy Dashboard" });
            setTimeout(() => {
              router.push(`/journey?view=dashboard`);
              setTransitioning(null);
            }, 2500);
          }
          // Don't send the "proceed to next" system note — we're auto-navigating
          return;
        }
      }

      await sendMessage(`(System Note: The diagram has been successfully updated with the key points for ${pillarName}. The user is ready to proceed. Please ask your questions for the next segment.)`);
    }
  };

  const handleDeclinePopulate = () => { setPendingPopulate(null); };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200 bg-white shadow-sm">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white mr-4 shadow-md">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Thinking Partner</h2>
          <p className="text-xs text-slate-500">{bizName} — {moduleId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
        </div>
      </div>

      {/* Messages */}
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
                <div className="prose prose-sm prose-slate max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-strong:text-slate-900 prose-em:text-red-600 prose-em:font-medium prose-em:not-italic prose-ul:my-2 prose-li:my-0 prose-li:marker:text-red-400 prose-headings:text-slate-900 prose-h3:text-sm prose-h3:font-bold">
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

        {/* Populate confirmation */}
        {pendingPopulate && (
          <div className="mx-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{PILLAR_DEF[pendingPopulate.pillar]?.emoji}</span>
              <p className="font-semibold text-emerald-800 text-sm">Ready to populate: {PILLAR_DEF[pendingPopulate.pillar]?.name}</p>
            </div>
            <ul className="text-xs text-emerald-700 space-y-1 mb-3 ml-7">
              {pendingPopulate.points.map((p, i) => <li key={i}>• {p}</li>)}
            </ul>
            <div className="flex gap-2 ml-7">
              <button onClick={handleConfirmPopulate} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                ✓ Yes, populate diagram
              </button>
              <button onClick={handleDeclinePopulate} className="px-4 py-1.5 rounded-lg bg-white text-slate-600 text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors">
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

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="relative flex items-end mx-1">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Share your analysis or ask a question..."
            className="w-full max-h-64 min-h-[80px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-14 text-sm outline-none resize-none transition-all focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20"
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(e); } }}
          />
          <button type="submit" disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-1.5 h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white transition-all hover:from-red-600 hover:to-red-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed shadow-sm">
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400">Shift + Enter for new line · Your Thinking Partner will guide you deeper</p>
        </div>
      </div>

      {/* Module Complete Transition Overlay */}
      {transitioning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center space-y-4 animate-in zoom-in-95 duration-500">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{STEP_NAMES[moduleId]} Complete!</h3>
              <p className="text-sm text-slate-500 mt-1">Great work. Moving to the next module...</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-red-600">
              <ArrowRight className="h-4 w-4" />
              <span>{transitioning.nextStepName}</span>
            </div>
            <div className="w-32 mx-auto h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full animate-progress" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
