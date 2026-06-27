"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, CheckCircle2, ArrowRight, Trash2 } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { usePortfolio } from "@/lib/PortfolioContext";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

// Maps moduleId (URL step) → which portfolio key to check
const MODULE_PILLAR_MAP: Record<string, { key: string; pillars: string[] }> = {
  "business-model": { key: "businessModel", pillars: ["valueProposition", "valueArchitecture", "contributions"] },
  "external-analysis": { key: "fiveForces", pillars: ["newEntrants", "suppliers", "rivalry", "buyers", "substitutes"] },
  "value-curve": { key: "valueCurve", pillars: ["valueCurve"] },
  "internal-analysis": { key: "vrio", pillars: ["valuable", "rare", "inimitable", "organized"] },
  "swot-synthesis": { key: "swot", pillars: ["strengths", "weaknesses", "opportunities", "threats"] },
  "innovation-directions": { key: "innovationDirections", pillars: ["direction1", "direction2", "direction3"] },
  "innovation-deepdive": { key: "innovationDirections", pillars: ["direction1", "direction2", "direction3"] },
};

// The order of steps and what comes next
const STEP_ORDER = ["business-model", "external-analysis", "value-curve", "internal-analysis", "swot-synthesis", "innovation-directions", "innovation-deepdive"];
const STEP_NAMES: Record<string, string> = {
  "business-model": "Business Model",
  "external-analysis": "External Analysis (5 Forces)",
  "value-curve": "Value Curve (Strategy Canvas)",
  "internal-analysis": "Internal Analysis (VRIO)",
  "swot-synthesis": "SWOT Synthesis",
  "innovation-directions": "Innovation Directions (3.14)",
  "innovation-deepdive": "Innovation Deep Dive",
};

interface Message {
  id: string;
  role: "user" | "coach";
  text: string;
}

const PILLAR_DEF: Record<string, {
  name: string;
  emoji: string;
  module: "businessModel" | "fiveForces" | "valueCurve" | "vrio" | "swot" | "innovationDirections";
}> = {
  valueProposition: { name: "Value Proposition", emoji: "🎯", module: "businessModel" },
  valueArchitecture: { name: "Value Architecture", emoji: "⚙️", module: "businessModel" },
  contributions: { name: "Contributions", emoji: "📊", module: "businessModel" },
  newEntrants: { name: "New Entrants", emoji: "🚧", module: "fiveForces" },
  suppliers: { name: "Suppliers", emoji: "🏭", module: "fiveForces" },
  rivalry: { name: "Industry Rivalry", emoji: "⚔️", module: "fiveForces" },
  buyers: { name: "Buyers", emoji: "🤝", module: "fiveForces" },
  substitutes: { name: "Substitutes", emoji: "🔄", module: "fiveForces" },
  valueCurve: { name: "Value Curve", emoji: "📈", module: "valueCurve" as any },
  valuable: { name: "Valuable", emoji: "💎", module: "vrio" },
  rare: { name: "Rare", emoji: "🦄", module: "vrio" },
  inimitable: { name: "Inimitable", emoji: "🛡️", module: "vrio" },
  organized: { name: "Organized", emoji: "🧩", module: "vrio" },
  strengths: { name: "Strengths", emoji: "💪", module: "swot" },
  weaknesses: { name: "Weaknesses", emoji: "⚠️", module: "swot" },
  opportunities: { name: "Opportunities", emoji: "🚀", module: "swot" },
  threats: { name: "Threats", emoji: "⚡", module: "swot" },
  direction1: { name: "Innovation Direction 1", emoji: "🧭", module: "innovationDirections" },
  direction2: { name: "Innovation Direction 2", emoji: "🧭", module: "innovationDirections" },
  direction3: { name: "Innovation Direction 3", emoji: "🧭", module: "innovationDirections" },
};

function parsePopulateCommand(text: string): { populates: { pillar: string; points: string[] }[]; cleanText: string } {
  const regex = /\[POPULATE:([a-zA-Z0-9]+)\]([\s\S]*?)(?:\[\/POPULATE\]|(?=\[POPULATE:))/gi;
  const populates: { pillar: string; points: string[] }[] = [];
  let cleanText = text;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const pillar = match[1];
    if (!PILLAR_DEF[pillar]) continue;
    const block = match[2] || "";
    const points = block.split('\n').map(l => l.trim()).map(l => l.replace(/^[\s•\-*]+/, '').trim()).filter(l => l.length > 0 && l.length < 500);
    if (points.length > 0) {
      populates.push({ pillar, points: points.slice(0, 8) });
    }
  }

  // Clean all POPULATE tags from the display text
  cleanText = text.replace(/\[POPULATE:[a-zA-Z0-9]+\]/gi, '').replace(/\[\/POPULATE\]/gi, '').trim();
  return { populates, cleanText };
}

function getGreeting(moduleId: string, bizName: string, lang?: string): string {
  const name = bizName || "your business";
  if (lang === "ja") {
    switch (moduleId) {
      case "business-model":
        return `**HECストラテジージャーニー**へようこそ！私はあなたの**シンキングパートナー**です。\n\n**${name}**のビジネスモデルを一緒に明確にしましょう。\n\n左側にOdyssey 3.14フレームワークの**3つの柱**が表示されています：\n\n- 🎯 **価値提案** — *誰が*顧客か？*何の*製品・サービスか？*どんな価格*か？\n- ⚙️ **価値アーキテクチャ** — *どのように*価値を提供するか？バリューチェーン、パートナー、資源は？\n- 📊 **貢献** — 財務・環境・社会的パフォーマンス\n\nでは始めましょう：**${name}は基本的に何をしており、主な顧客は誰ですか？**`;
      case "external-analysis":
        return `お帰りなさい。次は**${name}**の**外部環境**に目を向けましょう。\n\n**ポーターの5つの力**を使って競争環境を分析します。\n\n*${name}はどの産業で事業を展開していますか？*`;
      case "value-curve":
        return `${name}のバリューカーブを作成しましょう。まず、あなたの業界で顧客がプロバイダーを選ぶ際に重視する要素は何ですか？`;
      case "internal-analysis":
        return `再びお会いできて嬉しいです。**${name}**の**内部**を見てみましょう。\n\n**VRIOフレームワーク**を使って主要な資源を評価します。\n\n*${name}の最も重要な資源や能力は何だと思いますか？*`;
      case "swot-synthesis":
        return `**${name}**のすべてを**統合**する時です。\n\nこれはゼロからのスタートではありません。ビジネスモデル、5つの力、バリューカーブ、VRIOの分析から得られた知見を基に、**SWOT候補**を一緒にレビューしましょう。\n\n各象限の候補を提示しますので、挑戦・修正・却下してください。準備はできましたか？`;
      case "innovation-directions":
        return `素晴らしい！分析が完了したので、次は**イノベーション**について考えましょう。\n\n左側にOdyssey 3.14の**14の方向性**が表示されています。これらは、ビジネスモデルを革新するための具体的な道筋です。\n\n**あなたのタスク**: ${name}にとって最も重要だと思う**3つの方向性**を選び、その理由を書いてから「AIチャレンジに提出」をクリックしてください。\n\nあなたの選択を、これまでの分析に基づいて検証します。`;
      case "innovation-deepdive":
        return `${name}の**イノベーション・ディープダイブ**へようこそ！\n\n確認した3つの方向性について、マッキンゼーレベルの深い分析を行います。\n\n左の方向性タブから始めましょう。まず、**最初に掘り下げたい方向性**はどれですか？`;
      default: return `**${name}**の分析を続けましょう。`;
    }
  }
  if (lang === "fr") {
    switch (moduleId) {
      case "business-model":
        return `Bienvenue dans le **Parcours Stratégique HEC** ! Je suis votre **Partenaire de Réflexion**.\n\nConstruisons ensemble une image claire du modèle d'affaires de **${name}**.\n\nSur la gauche, vous voyez les **3 piliers** du framework Odyssey 3.14 :\n\n- 🎯 **Proposition de Valeur** — *Qui* sont vos clients ? *Quels* produits/services ? *Quel prix* ?\n- ⚙️ **Architecture de Valeur** — *Comment* livrez-vous de la valeur ? Chaîne de valeur, partenaires, ressources ?\n- 📊 **Contributions** — Performance financière, environnementale et sociétale.\n\nCommençons : **Que fait fondamentalement ${name}, et qui sont ses principaux clients ?**`;
      case "external-analysis":
        return `Bienvenue. Tournons notre regard vers **l'extérieur** pour **${name}**.\n\nNous utiliserons les **5 Forces de Porter** pour cartographier la dynamique concurrentielle.\n\n*Dans quel secteur opère ${name} ?*`;
      case "value-curve":
        return `Créons la courbe de valeur de ${name}. Quels sont les facteurs clés que les clients de votre secteur utilisent pour choisir entre les fournisseurs ?`;
      case "internal-analysis":
        return `Ravi de vous revoir. Regardons **l'intérieur** de **${name}**.\n\nNous utiliserons le **framework VRIO** pour évaluer les ressources clés.\n\n*Quelle est la ressource ou capacité la plus importante de ${name} selon vous ?*`;
      case "swot-synthesis":
        return `Il est temps de **synthétiser** tout pour **${name}**.\n\nCe n'est pas un départ de zéro. À partir de vos analyses du Modèle d'Affaires, des 5 Forces, de la Courbe de Valeur et du VRIO, je vais proposer des **candidats SWOT** que nous examinerons ensemble.\n\nJe présenterai des éléments pour chaque quadrant — défiez, modifiez ou rejetez ce qui ne vous semble pas juste. Prêt ?`;
      case "innovation-directions":
        return `Excellent ! Votre analyse est complète. Passons maintenant à l'**innovation**.\n\nSur la gauche, vous voyez les **14 directions** d'Odyssey 3.14 — des pistes concrètes pour réinventer votre modèle d'affaires.\n\n**Votre mission** : choisissez les **3 directions** les plus pertinentes pour **${name}**, expliquez pourquoi, puis soumettez vos choix pour un challenge IA.\n\nJe confronterai vos choix à votre analyse stratégique.`;
      case "innovation-deepdive":
        return `Bienvenue dans le **Deep Dive Innovation** de ${name} !\n\nNous allons maintenant explorer en profondeur chacune de vos 3 directions confirmées avec une analyse de niveau McKinsey.\n\nChoisissez un onglet de direction à gauche. **Par quelle direction souhaitez-vous commencer ?**`;
      default: return `Continuons l'analyse de **${name}**.`;
    }
  }
  if (lang === "zh") {
    switch (moduleId) {
      case "business-model":
        return `欢迎来到**HEC战略之旅**！我是你的**思维伙伴**。\n\n让我们一起清晰地描绘**${name}**的商业模式。\n\n在左边，您可以看到Odyssey 3.14框架的**3个支柱**：\n\n- 🎯 **价值主张** — *谁*是客户？*什么*产品/服务？*什么价格*？\n- ⚙️ **价值架构** — *如何*交付价值？价值链、合作伙伴、资源？\n- 📊 **贡献** — 财务、环境和社会绩效\n\n让我们开始吧：**${name}从根本上做什么，主要客户是谁？**`;
      case "external-analysis":
        return `欢迎回来。现在让我们将目光转向**${name}**的**外部环境**。\n\n我们将使用**波特五力模型**来分析竞争格局。\n\n*${name}在哪个行业运营？*`;
      case "value-curve":
        return `让我们为${name}绘制价值曲线。在您的行业中，客户在选择供应商时主要考虑哪些因素？`;
      case "internal-analysis":
        return `很高兴再次见到你。让我们审视**${name}**的**内部**。\n\n我们将使用**VRIO框架**来评估关键资源。\n\n*您认为${name}最重要的资源或能力是什么？*`;
      case "swot-synthesis":
        return `是时候为**${name}****综合**所有内容了。\n\n这不是从零开始。基于您的商业模式、五力、价值曲线和VRIO分析，我将提出**SWOT候选项**供我们一起审查。\n\n我会为每个象限提出建议——请挑战、修改或否决任何不合适的内容。准备好了吗？`;
      case "innovation-directions":
        return `太棒了！分析完成后，让我们开始**创新**思考。\n\n左侧展示了Odyssey 3.14的**14个方向** — 这些是重塑商业模式的具体路径。\n\n**您的任务**：选择对**${name}**最重要的**3个方向**，写下理由，然后提交接受AI挑战。\n\n我会根据您之前的分析来质疑您的选择。`;
      case "innovation-deepdive":
        return `欢迎来到${name}的**创新深度探索**！\n\n我们将对您确认的3个方向进行麦肯锡级别的深入分析。\n\n从左侧选择一个方向标签。**您想先深入哪个方向？**`;
      default: return `让我们继续分析**${name}**。`;
    }
  }
  // Default: English
  switch (moduleId) {
    case "business-model":
      return `Welcome to the **HEC Strategy Journey**! I'm your **Thinking Partner**.\n\nLet's build a crystal-clear picture of **${name}**'s business model.\n\nOn the left, you can see the **3 pillars** from the Odyssey 3.14 framework:\n\n- 🎯 **Value Proposition** — *Who* are your customers? *What* products/services? At *what price*?\n- ⚙️ **Value Architecture** — *How* do you deliver value? Value chain, partners, resources?\n- 📊 **Contributions** — Financial, environmental, and societal performance.\n\nLet's start: **What does ${name} fundamentally do, and who are its primary customers?**`;
    case "external-analysis":
      return `Welcome back. Now let's shift our lens **outward** for **${name}**.\n\nWe'll use **Porter's 5 Forces** to map the competitive dynamics.\n\n*In broad terms, which industry does ${name} operate in?*`;
    case "value-curve":
      return `Let's map your competitive positioning with a Value Curve for ${name}. What are the key factors that customers in your industry use when choosing between providers?`;
    case "internal-analysis":
      return `Good to see you again. Let's look **inward** at **${name}**.\n\nWe'll use the **VRIO framework** to evaluate key resources.\n\n*What do you believe is ${name}'s single most important resource or capability?*`;
    case "swot-synthesis":
      return `Time to **synthesize** everything for **${name}**.\n\nThis is not a blank slate. Based on your Business Model, 5 Forces, Value Curve, and VRIO analysis, I'll propose **SWOT candidates** for us to review together.\n\nI'll present draft items for each quadrant — challenge, modify, or reject anything that doesn't feel right. Ready?`;
    case "innovation-directions":
      return `Excellent! Your analysis is complete. Now let's think about **innovation**.\n\nOn the left, you can see the **14 Directions** from the Odyssey 3.14 framework — concrete pathways to reinvent your business model.\n\n**Your task**: Select the **3 directions** most relevant for **${name}**, write why each matters, then click "Submit for AI Challenge".\n\nI'll stress-test your choices against your entire strategic analysis.`;
    case "innovation-deepdive":
      return `Welcome to the **Innovation Deep Dive** for ${name}!\n\nWe'll now explore each of your 3 confirmed directions in depth with McKinsey-level analysis.\n\nSelect a direction tab on the left. **Which direction would you like to start with?**`;
    default:
      return `Let's continue analyzing **${name}**.`;
  }
}

export default function ChatPane({ moduleId }: { moduleId: string }) {
  const { user } = useAuth();
  const { portfolio, populatePillar, populateInnovationDeepDive } = usePortfolio();
  const router = useRouter();
  const bizName = portfolio.myAnalysis?.businessName || "My Business";

  const chatLang = portfolio.myAnalysis?.chatLanguage || "en";

  const [activeDirectionId, setActiveDirectionId] = useState<number | null>(null);
  const [activeDirectionName, setActiveDirectionName] = useState<string>("");

  useEffect(() => {
    if (moduleId !== "innovation-deepdive") return;
    const handleDirectionChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.directionId) {
        setActiveDirectionId(detail.directionId);
        setActiveDirectionName(detail.directionName || "");
      }
    };
    window.addEventListener("direction-changed", handleDirectionChanged);
    const confirmed = portfolio.myAnalysis?.innovationDirections?.selectedDirections;
    if (confirmed && confirmed.length > 0 && !activeDirectionId) {
      setActiveDirectionId(confirmed[0].id);
      setActiveDirectionName(confirmed[0].name);
    }
    return () => window.removeEventListener("direction-changed", handleDirectionChanged);
  }, [moduleId, portfolio.myAnalysis?.innovationDirections?.selectedDirections, activeDirectionId]);

  const chatDocId = moduleId === "innovation-deepdive" && activeDirectionId
    ? `innovation-deepdive-${activeDirectionId}`
    : moduleId;

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "coach", text: getGreeting(moduleId, bizName, chatLang) }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingPopulates, setPendingPopulates] = useState<{ pillar: string; points: string[] }[]>([]);
  const [transitioning, setTransitioning] = useState<{ nextStep: string; nextStepName: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset chat state when switching modules or directions
  const prevChatDocRef = useRef(chatDocId);
  useEffect(() => {
    if (prevChatDocRef.current !== chatDocId) {
      const greetingText = moduleId === "innovation-deepdive" && activeDirectionName
        ? `Let's deep dive into **${activeDirectionName}** for ${bizName}. I'll help you develop this direction with McKinsey-level strategic depth. What aspect would you like to explore first?`
        : getGreeting(moduleId, bizName, chatLang);
      setMessages([{ id: "1", role: "coach", text: greetingText }]);
      prevChatDocRef.current = chatDocId;
    }
  }, [chatDocId, moduleId, activeDirectionName, bizName, chatLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, pendingPopulates]);

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
        valueCurve: portfolio.myAnalysis.valueCurve,
        vrio: portfolio.myAnalysis.vrio,
        swot: portfolio.myAnalysis.swot,
        innovationDirections: portfolio.myAnalysis.innovationDirections,
      } : {};

      let otherDirectionContext = "";
      if (moduleId === "innovation-deepdive" && activeDirectionId && user) {
        const confirmed = portfolio.myAnalysis?.innovationDirections?.selectedDirections || [];
        const otherDirIds = confirmed.filter(d => d.id !== activeDirectionId);
        const otherChats: string[] = [];
        for (const dir of otherDirIds) {
          try {
            const { getDoc } = await import("firebase/firestore");
            const chatSnap = await getDoc(doc(db, "users", user.uid, "chats", `innovation-deepdive-${dir.id}`));
            if (chatSnap.exists()) {
              const chatData = chatSnap.data();
              const msgs = (chatData.messages || []).slice(-6);
              if (msgs.length > 0) {
                const summary = msgs.map((m: any) => `${m.role === 'coach' ? 'AI' : 'User'}: ${m.text.substring(0, 200)}`).join('\n');
                otherChats.push(`--- Direction: ${dir.name} (${dir.pillar}) ---\n${summary}`);
              }
            }
          } catch (e) { /* ignore */ }
        }
        if (otherChats.length > 0) otherDirectionContext = otherChats.join('\n\n');
      }

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
          otherDirectionContext,
          activeDirectionName,
        }),
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      const { populates, cleanText } = parsePopulateCommand(data.text);
      const cleanMessage = { ...data, text: cleanText };
      const finalMessages = [...updatedMessages, cleanMessage];
      setMessages(finalMessages);
      await saveToFirestore(finalMessages);

      if (populates.length > 0) {
        setPendingPopulates(populates);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "coach", text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessageRef = useRef<typeof sendMessage>(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    const handleInnovationChallenge = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.selections && Array.isArray(detail.selections)) {
        const selectionsText = detail.selections.map((s: any, i: number) =>
          `${i + 1}. **${s.name}** (${s.pillar})\n   Justification: ${s.justification}`
        ).join('\n\n');
        const challengeMsg = `I've selected my 3 innovation directions. Please challenge my choices:\n\n${selectionsText}`;
        sendMessageRef.current(challengeMsg);
      }
    };
    const handleInnovationConfirmed = () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'coach' as const,
        text: '🎯 Excellent! Your 3 innovation directions are confirmed. Navigate to **Deep Dive** in the sidebar to develop each direction with strategic depth.'
      }]);
    };
    const handleInnovationAskAI = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.directionName && detail?.fieldLabel) {
        const msg = `I'm working on my innovation direction **${detail.directionName}**. Help me think through the **${detail.fieldLabel}** field. What should I consider? Push me to be specific and strategic.`;
        sendMessageRef.current(msg);
      }
    };
    window.addEventListener('innovation-challenge', handleInnovationChallenge);
    window.addEventListener('innovation-confirmed', handleInnovationConfirmed);
    window.addEventListener('innovation-askai', handleInnovationAskAI);
    return () => {
      window.removeEventListener('innovation-challenge', handleInnovationChallenge);
      window.removeEventListener('innovation-confirmed', handleInnovationConfirmed);
      window.removeEventListener('innovation-askai', handleInnovationAskAI);
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    await sendMessage(currentInput);
  };

  const handleConfirmPopulate = async () => {
    if (pendingPopulates.length === 0) return;
    const current = pendingPopulates[0];
    const def = PILLAR_DEF[current.pillar];
    
    // Special handling for innovation direction populates
    if (def?.module === "innovationDirections" && (moduleId === "innovation-directions" || moduleId === "innovation-deepdive")) {
      const inn = portfolio.myAnalysis?.innovationDirections;
      const dirIndex = current.pillar === "direction1" ? 0 : current.pillar === "direction2" ? 1 : 2;
      const directionId = inn?.selectedDirections?.[dirIndex]?.id;
      if (directionId !== undefined) {
        // Parse structured fields from populate points
        const parseField = (prefix: string) => current.points.find(p => p.toLowerCase().startsWith(prefix.toLowerCase()))?.replace(new RegExp(`^${prefix}:?\\s*`, 'i'), '') || '';
        populateInnovationDeepDive(directionId, {
          idea: parseField('Idea'),
          newValueProposition: parseField('New Value Proposition'),
          newValueArchitecture: parseField('New Value Architecture'),
          expectedContributions: parseField('Expected Contributions'),
          keyBarriers: parseField('Key Barriers'),
          firstStep: parseField('First Step'),
        });
      }
    } else if (def) {
      populatePillar(def.module as "businessModel" | "fiveForces" | "vrio" | "swot", current.pillar, current.points);
    }
    const pillarName = def ? def.name : current.pillar;
    const remaining = pendingPopulates.slice(1);
    setPendingPopulates(remaining);

    // If there are more populates in the queue, don't proceed yet
    if (remaining.length > 0) return;

    // Check if the current module is now FULLY populated
    const moduleInfo = MODULE_PILLAR_MAP[moduleId];
    if (moduleInfo && portfolio.myAnalysis) {
      const moduleData = (portfolio.myAnalysis as any)[moduleInfo.key];
      const alreadyDone = moduleInfo.pillars.filter((p: string) => moduleData[p]?.populated).length;
      const justPopulated = moduleInfo.pillars.includes(current.pillar) ? 1 : 0;
      const totalDone = alreadyDone + (moduleData[current.pillar]?.populated ? 0 : justPopulated);

      if (totalDone >= moduleInfo.pillars.length) {
        const currentIdx = STEP_ORDER.indexOf(moduleId);
        if (currentIdx < STEP_ORDER.length - 1) {
          const nextStep = STEP_ORDER[currentIdx + 1];
          setTransitioning({ nextStep, nextStepName: STEP_NAMES[nextStep] });
          setTimeout(() => {
            router.push(`/journey?view=analysis&step=${nextStep}`);
            setTransitioning(null);
          }, 2500);
        } else {
          setTransitioning({ nextStep: "dashboard", nextStepName: "Strategy Dashboard" });
          setTimeout(() => {
            router.push(`/journey?view=dashboard`);
            setTransitioning(null);
          }, 2500);
        }
        return;
      }
    }

    await sendMessage(`(System Note: The diagram has been successfully updated with the key points for ${pillarName}. The user is ready to proceed. Please ask your questions for the next segment.)`);
  };

  const handleDeclinePopulate = () => { setPendingPopulates([]); };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200 bg-white shadow-sm">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white mr-4 shadow-md">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Thinking Partner</h2>
          <p className="text-xs text-slate-500">{bizName} — {moduleId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
        </div>
        {(moduleId === "innovation-directions" || moduleId === "innovation-deepdive") && messages.length > 1 && (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Clear this chat history? This cannot be undone.")) return;
              const greeting = moduleId === "innovation-deepdive" && activeDirectionName
                ? `Welcome to the **Innovation Deep Dive** for ${bizName}!\n\nWe'll now explore each of your 3 confirmed directions in depth with McKinsey-level analysis.\n\nSelect a direction tab on the left. **Which direction would you like to start with?**`
                : getGreeting(moduleId, bizName, chatLang);
              setMessages([{ id: "1", role: "coach", text: greeting }]);
              if (user) {
                try {
                  await deleteDoc(doc(db, "users", user.uid, "chats", chatDocId));
                } catch (e) { /* ignore */ }
              }
            }}
            className="ml-2 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "coach" && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white mr-3 mt-1 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={clsx(
              "max-w-[80%] rounded-2xl shadow-sm",
              msg.role === "coach"
                ? "bg-white text-slate-800 border border-slate-100 rounded-tl-sm px-5 py-4"
                : "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm px-5 py-3"
            )}>
              {msg.role === "coach" ? (
                <div className="prose prose-sm prose-slate max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-strong:text-slate-900 prose-em:text-indigo-600 prose-em:font-medium prose-em:not-italic prose-ul:my-2 prose-li:my-0 prose-li:marker:text-indigo-400 prose-headings:text-slate-900 prose-h3:text-sm prose-h3:font-bold">
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
        {pendingPopulates.length > 0 && (
          <div className="mx-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{PILLAR_DEF[pendingPopulates[0].pillar]?.emoji}</span>
              <p className="font-semibold text-emerald-800 text-sm">Ready to populate: {PILLAR_DEF[pendingPopulates[0].pillar]?.name}{pendingPopulates.length > 1 ? ` (1 of ${pendingPopulates.length})` : ""}</p>
            </div>
            <ul className="text-xs text-emerald-700 space-y-1 mb-3 ml-7">
              {pendingPopulates[0].points.map((p: string, i: number) => <li key={i}>• {p}</li>)}
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
            <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-white mr-3 mt-1 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-5 py-4 rounded-2xl shadow-sm bg-white border border-slate-100 rounded-tl-sm flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
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
            className="w-full max-h-64 min-h-[80px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-14 text-sm outline-none resize-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(e); } }}
          />
          <button type="submit" disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-1.5 h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white transition-all hover:from-red-600 hover:to-red-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed shadow-sm">
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
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600">
              <ArrowRight className="h-4 w-4" />
              <span>{transitioning.nextStepName}</span>
            </div>
            <div className="w-32 mx-auto h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-progress" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
