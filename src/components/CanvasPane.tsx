"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePortfolio, LANGUAGE_FLAGS } from "@/lib/PortfolioContext";
import type { AppLanguage } from "@/lib/PortfolioContext";
import type { PillarData, ValueCurveState, ValueCurveFactor } from "@/lib/PortfolioContext";

// ── Translation Maps ──
const TRANSLATIONS: Record<string, Record<AppLanguage, string>> = {
  // Module titles & descriptions
  "Business Model": { en: "Business Model", ja: "ビジネスモデル", fr: "Modèle d'Affaires", zh: "商业模式" },
  "External Analysis": { en: "External Analysis", ja: "外部分析", fr: "Analyse Externe", zh: "外部分析" },
  "Internal Analysis": { en: "Internal Analysis", ja: "内部分析", fr: "Analyse Interne", zh: "内部分析" },
  "SWOT Synthesis": { en: "SWOT Synthesis", ja: "SWOT統合", fr: "Synthèse SWOT", zh: "SWOT综合" },
  "bm-desc": { en: "Define the core elements of your business model using the Odyssey 3.14 framework.", ja: "Odyssey 3.14フレームワークを使って、ビジネスモデルの核心要素を定義しましょう。", fr: "Définissez les éléments clés de votre modèle d'affaires avec le framework Odyssey 3.14.", zh: "使用Odyssey 3.14框架定义您商业模式的核心要素。" },
  "ea-desc": { en: "Analyze the competitive forces shaping your industry using Porter's 5 Forces.", ja: "ポーターの5つの力を使って、業界を形成する競争要因を分析しましょう。", fr: "Analysez les forces concurrentielles de votre industrie avec les 5 Forces de Porter.", zh: "使用波特五力模型分析塑造您行业的竞争力量。" },
  "ia-desc": { en: "Evaluate key resources and capabilities using the VRIO framework.", ja: "VRIOフレームワークを使って、主要な資源と能力を評価しましょう。", fr: "Évaluez vos ressources et capacités clés avec le framework VRIO.", zh: "使用VRIO框架评估关键资源和能力。" },
  "sw-desc": { en: "Combine your external and internal analyses into a comprehensive SWOT.", ja: "外部分析と内部分析を包括的なSWOTに統合しましょう。", fr: "Combinez vos analyses externe et interne en une synthèse SWOT complète.", zh: "将外部和内部分析合并为综合SWOT。" },
  // Business Model segments
  "Value Proposition": { en: "Value Proposition", ja: "価値提案", fr: "Proposition de Valeur", zh: "价值主张" },
  "Who? What?": { en: "Who? What?", ja: "誰に？何を？", fr: "Qui ? Quoi ?", zh: "谁？什么？" },
  "Value Architecture": { en: "Value Architecture", ja: "価値アーキテクチャ", fr: "Architecture de Valeur", zh: "价值架构" },
  "How?": { en: "How?", ja: "どのように？", fr: "Comment ?", zh: "如何？" },
  "Contributions": { en: "Contributions", ja: "貢献", fr: "Contributions", zh: "贡献" },
  "How much?": { en: "How much?", ja: "どのくらい？", fr: "Combien ?", zh: "多少？" },
  "Customers": { en: "Customers", ja: "顧客", fr: "Clients", zh: "客户" },
  "Products and/or services": { en: "Products and/or services", ja: "製品・サービス", fr: "Produits et/ou services", zh: "产品和/或服务" },
  "Price": { en: "Price", ja: "価格", fr: "Prix", zh: "价格" },
  "Value chain": { en: "Value chain", ja: "バリューチェーン", fr: "Chaîne de valeur", zh: "价值链" },
  "Partners": { en: "Partners", ja: "パートナー", fr: "Partenaires", zh: "合作伙伴" },
  "Resources & competencies": { en: "Resources & competencies", ja: "資源と能力", fr: "Ressources & compétences", zh: "资源与能力" },
  "Environmental": { en: "Environmental", ja: "環境", fr: "Environnemental", zh: "环境" },
  "Financial": { en: "Financial", ja: "財務", fr: "Financier", zh: "财务" },
  "Societal": { en: "Societal", ja: "社会", fr: "Sociétal", zh: "社会" },
  // 5 Forces
  "New Entrants": { en: "New Entrants", ja: "新規参入", fr: "Nouveaux Entrants", zh: "新进入者" },
  "Threat": { en: "Threat", ja: "脅威", fr: "Menace", zh: "威胁" },
  "Suppliers": { en: "Suppliers", ja: "供給者", fr: "Fournisseurs", zh: "供应商" },
  "Bargaining Power": { en: "Bargaining Power", ja: "交渉力", fr: "Pouvoir de Négociation", zh: "议价能力" },
  "Industry Rivalry": { en: "Industry Rivalry", ja: "業界内競争", fr: "Rivalité Industrielle", zh: "行业竞争" },
  "Competition Intensity": { en: "Competition Intensity", ja: "競争の強度", fr: "Intensité Concurrentielle", zh: "竞争强度" },
  "Buyers": { en: "Buyers", ja: "買い手", fr: "Acheteurs", zh: "买家" },
  "Substitutes": { en: "Substitutes", ja: "代替品", fr: "Substituts", zh: "替代品" },
  "Capital requirements": { en: "Capital requirements", ja: "必要資本", fr: "Exigences en capital", zh: "资本需求" },
  "Brand loyalty": { en: "Brand loyalty", ja: "ブランド忠誠度", fr: "Fidélité à la marque", zh: "品牌忠诚度" },
  "Supplier concentration": { en: "Supplier concentration", ja: "供給者の集中度", fr: "Concentration des fournisseurs", zh: "供应商集中度" },
  "Switching costs": { en: "Switching costs", ja: "切替コスト", fr: "Coûts de changement", zh: "转换成本" },
  "Competitor concentration": { en: "Competitor concentration", ja: "競合の集中度", fr: "Concentration des concurrents", zh: "竞争者集中度" },
  "Industry growth": { en: "Industry growth", ja: "業界成長率", fr: "Croissance de l'industrie", zh: "行业增长" },
  "Buyer concentration": { en: "Buyer concentration", ja: "買い手の集中度", fr: "Concentration des acheteurs", zh: "买家集中度" },
  "Price sensitivity": { en: "Price sensitivity", ja: "価格感度", fr: "Sensibilité au prix", zh: "价格敏感度" },
  "Substitute performance": { en: "Substitute performance", ja: "代替品の性能", fr: "Performance des substituts", zh: "替代品性能" },
  "Cost of change": { en: "Cost of change", ja: "変更コスト", fr: "Coût du changement", zh: "变更成本" },
  // VRIO
  "Valuable": { en: "Valuable", ja: "価値がある", fr: "De Valeur", zh: "有价值的" },
  "Is it?": { en: "Is it?", ja: "それは？", fr: "Est-ce ?", zh: "是否？" },
  "Rare": { en: "Rare", ja: "希少性", fr: "Rare", zh: "稀有的" },
  "Inimitable": { en: "Inimitable", ja: "模倣困難", fr: "Inimitable", zh: "不可模仿的" },
  "Is it costly to copy?": { en: "Is it costly to copy?", ja: "模倣にコストがかかるか？", fr: "Est-il coûteux à copier ?", zh: "模仿成本高吗？" },
  "Organized": { en: "Organized", ja: "組織化", fr: "Organisé", zh: "有组织的" },
  "Are you?": { en: "Are you?", ja: "組織は？", fr: "Êtes-vous ?", zh: "您是否？" },
  "Do you offer value?": { en: "Do you offer value?", ja: "価値を提供しているか？", fr: "Offrez-vous de la valeur ?", zh: "您提供价值吗？" },
  "Do many others have it?": { en: "Do many others have it?", ja: "他社も持っているか？", fr: "D'autres l'ont-ils ?", zh: "其他人也有吗？" },
  "Can it be easily copied?": { en: "Can it be easily copied?", ja: "簡単に模倣できるか？", fr: "Peut-il être facilement copié ?", zh: "容易被复制吗？" },
  "Is the firm organized to exploit it?": { en: "Is the firm organized to exploit it?", ja: "それを活用する組織体制か？", fr: "L'entreprise est-elle organisée pour l'exploiter ?", zh: "公司是否有组织地利用它？" },
  // SWOT
  "Strengths": { en: "Strengths", ja: "強み", fr: "Forces", zh: "优势" },
  "Internal Positive": { en: "Internal Positive", ja: "内部プラス要因", fr: "Interne Positif", zh: "内部积极因素" },
  "Weaknesses": { en: "Weaknesses", ja: "弱み", fr: "Faiblesses", zh: "劣势" },
  "Internal Negative": { en: "Internal Negative", ja: "内部マイナス要因", fr: "Interne Négatif", zh: "内部消极因素" },
  "Opportunities": { en: "Opportunities", ja: "機会", fr: "Opportunités", zh: "机会" },
  "External Positive": { en: "External Positive", ja: "外部プラス要因", fr: "Externe Positif", zh: "外部积极因素" },
  "Threats": { en: "Threats", ja: "脅威", fr: "Menaces", zh: "威胁" },
  "External Negative": { en: "External Negative", ja: "外部マイナス要因", fr: "Externe Négatif", zh: "外部消极因素" },
  "What do you do well?": { en: "What do you do well?", ja: "何が得意か？", fr: "Que faites-vous bien ?", zh: "您擅长什么？" },
  "Where do you lack resources?": { en: "Where do you lack resources?", ja: "どこにリソースが不足しているか？", fr: "Où manquez-vous de ressources ?", zh: "您在哪里缺乏资源？" },
  "What trends can you leverage?": { en: "What trends can you leverage?", ja: "活用できるトレンドは？", fr: "Quelles tendances exploiter ?", zh: "您可以利用哪些趋势？" },
  "What could harm you?": { en: "What could harm you?", ja: "何が脅威になるか？", fr: "Qu'est-ce qui pourrait vous nuire ?", zh: "什么可能伤害您？" },
  // Value Curve
  "Value Curve": { en: "Value Curve", ja: "バリューカーブ", fr: "Courbe de Valeur", zh: "价值曲线" },
  "vc-desc": { en: "Map your competitive positioning against key industry factors", ja: "主要な業界要因に対する競争ポジションをマッピング", fr: "Cartographiez votre positionnement concurrentiel", zh: "绘制您的竞争定位" },
};

function t(key: string, lang: AppLanguage): string {
  return TRANSLATIONS[key]?.[lang] || key;
}

const MODULE_DESCS: Record<string, string> = {
  "business-model": "bm-desc",
  "external-analysis": "ea-desc",
  "value-curve": "vc-desc",
  "internal-analysis": "ia-desc",
  "swot-synthesis": "sw-desc",
};

const MODULE_TITLES: Record<string, string> = {
  "business-model": "Business Model",
  "external-analysis": "External Analysis",
  "value-curve": "Value Curve",
  "internal-analysis": "Internal Analysis",
  "swot-synthesis": "SWOT Synthesis",
};

// ── Translation Cache Hook ──
type TranslationCache = Record<string, string[]>; // key: `${pillarKey}:${lang}` -> translated points

function useTranslatedPoints(diagramLang: AppLanguage, chatLang: AppLanguage) {
  const [cache, setCache] = useState<TranslationCache>({});
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const inflight = useRef<Set<string>>(new Set());

  const getTranslated = useCallback((pillarKey: string, pillar: PillarData): string[] | null => {
    if (!pillar.populated || diagramLang === chatLang) return null; // use originals
    const cacheKey = `${pillarKey}:${diagramLang}:${pillar.points.join("|")}`.substring(0, 200);
    return cache[cacheKey] || null;
  }, [cache, diagramLang, chatLang]);

  const requestTranslation = useCallback(async (pillarKey: string, pillar: PillarData) => {
    if (!pillar.populated || diagramLang === chatLang) return;
    const cacheKey = `${pillarKey}:${diagramLang}:${pillar.points.join("|")}`.substring(0, 200);
    if (cache[cacheKey] || inflight.current.has(cacheKey)) return;

    inflight.current.add(cacheKey);
    setTranslating(prev => new Set(prev).add(pillarKey));

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: pillar.points, targetLanguage: diagramLang, sourceLanguage: chatLang }),
      });
      if (res.ok) {
        const { translated } = await res.json();
        setCache(prev => ({ ...prev, [cacheKey]: translated }));
      }
    } catch (e) {
      console.error("Translation failed:", e);
    } finally {
      inflight.current.delete(cacheKey);
      setTranslating(prev => { const n = new Set(prev); n.delete(pillarKey); return n; });
    }
  }, [diagramLang, chatLang, cache]);

  const isTranslating = useCallback((pillarKey: string) => translating.has(pillarKey), [translating]);

  return { getTranslated, requestTranslation, isTranslating };
}

// ── Segment Card ──
function SegmentCard({
  title, subtitle, bgFrom, bgTo, icon, defaultItems, populatedItems, isPopulated, lang, translatedItems, isTranslating: loading,
}: {
  title: string; subtitle: string; bgFrom: string; bgTo: string; icon: string;
  defaultItems: string[]; populatedItems: string[]; isPopulated: boolean; lang: AppLanguage;
  translatedItems?: string[] | null; isTranslating?: boolean;
}) {
  const items = isPopulated
    ? (translatedItems || populatedItems)
    : defaultItems.map(i => t(i, lang));
  return (
    <div
      className="rounded-2xl p-4 transition-all duration-500 shadow-md relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`, minHeight: isPopulated ? 'auto' : '120px' }}
    >
      {isPopulated && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div>
          <h3 className="text-white font-bold text-[14px] leading-tight drop-shadow-sm">{t(title, lang)}</h3>
          <p className="text-white/60 text-[10px] italic">{t(subtitle, lang)}</p>
        </div>
        {isPopulated && (
          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
            {loading ? "⟳" : "✓"}
          </span>
        )}
      </div>
      <ul className="space-y-1 mt-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${isPopulated ? "bg-white" : "bg-white/40"}`} />
            <span className={`text-[11px] leading-snug ${isPopulated ? "text-white font-medium" : "text-white/50 italic"} ${loading ? "animate-pulse" : ""}`}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Language Toggle ──
function LanguageToggle({ current, onChange }: { current: AppLanguage; onChange: (lang: AppLanguage) => void }) {
  const langs: AppLanguage[] = ["en", "ja", "fr", "zh"];
  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      {langs.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-2 py-1 rounded-md text-sm transition-all ${
            current === lang
              ? "bg-white shadow-sm text-slate-800 font-semibold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {LANGUAGE_FLAGS[lang]}
        </button>
      ))}
    </div>
  );
}

// ── Translation Props ──
interface TranslationProps {
  lang: AppLanguage;
  getTranslated: (key: string, pillar: PillarData) => string[] | null;
  requestTranslation: (key: string, pillar: PillarData) => void;
  isTranslating: (key: string) => boolean;
}

// ── Business Model ──
function BusinessModelDiagram({ lang, getTranslated, requestTranslation, isTranslating }: TranslationProps) {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const bm = portfolio.myAnalysis.businessModel;

  useEffect(() => {
    requestTranslation("valueProposition", bm.valueProposition);
    requestTranslation("valueArchitecture", bm.valueArchitecture);
    requestTranslation("contributions", bm.contributions);
  }, [lang, bm]);

  return (
    <div className="flex flex-col flex-1">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <SegmentCard title="Value Proposition" subtitle="Who? What?" bgFrom="#E8634A" bgTo="#D94E38" icon="🎯"
          defaultItems={["Customers", "Products and/or services", "Price"]}
          populatedItems={bm.valueProposition.points} isPopulated={bm.valueProposition.populated} lang={lang}
          translatedItems={getTranslated("valueProposition", bm.valueProposition)} isTranslating={isTranslating("valueProposition")} />
        <SegmentCard title="Value Architecture" subtitle="How?" bgFrom="#1EB5C4" bgTo="#1A9AAD" icon="⚙️"
          defaultItems={["Value chain", "Partners", "Resources & competencies"]}
          populatedItems={bm.valueArchitecture.points} isPopulated={bm.valueArchitecture.populated} lang={lang}
          translatedItems={getTranslated("valueArchitecture", bm.valueArchitecture)} isTranslating={isTranslating("valueArchitecture")} />
      </div>
      <div className="w-[calc(50%-0.375rem)] mx-auto mb-3">
        <SegmentCard title="Contributions" subtitle="How much?" bgFrom="#89B630" bgTo="#7AA525" icon="📊"
          defaultItems={["Environmental", "Financial", "Societal"]}
          populatedItems={bm.contributions.points} isPopulated={bm.contributions.populated} lang={lang}
          translatedItems={getTranslated("contributions", bm.contributions)} isTranslating={isTranslating("contributions")} />
      </div>
      <div className="mt-auto pt-2">
        <p className="text-[10px] text-slate-400 italic">Odyssey 3.14 — Lehmann-Ortega, Musikas, Schoettl</p>
      </div>
    </div>
  );
}

// ── 5 Forces ──
function FiveForcesPane({ lang, getTranslated, requestTranslation, isTranslating }: TranslationProps) {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const ff = portfolio.myAnalysis.fiveForces;

  useEffect(() => {
    requestTranslation("newEntrants", ff.newEntrants);
    requestTranslation("suppliers", ff.suppliers);
    requestTranslation("rivalry", ff.rivalry);
    requestTranslation("buyers", ff.buyers);
    requestTranslation("substitutes", ff.substitutes);
  }, [lang, ff]);

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto">
        <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full max-w-[800px]">
          <div className="col-start-2 row-start-1">
            <SegmentCard title="New Entrants" subtitle="Threat" bgFrom="#64748b" bgTo="#475569" icon="🚧"
              defaultItems={["Capital requirements", "Brand loyalty"]}
              populatedItems={ff.newEntrants.points} isPopulated={ff.newEntrants.populated} lang={lang}
              translatedItems={getTranslated("newEntrants", ff.newEntrants)} isTranslating={isTranslating("newEntrants")} />
          </div>
          <div className="col-start-1 row-start-2">
            <SegmentCard title="Suppliers" subtitle="Bargaining Power" bgFrom="#64748b" bgTo="#475569" icon="🏭"
              defaultItems={["Supplier concentration", "Switching costs"]}
              populatedItems={ff.suppliers.points} isPopulated={ff.suppliers.populated} lang={lang}
              translatedItems={getTranslated("suppliers", ff.suppliers)} isTranslating={isTranslating("suppliers")} />
          </div>
          <div className="col-start-2 row-start-2 z-10 shadow-xl ring-2 ring-indigo-500/30 rounded-2xl">
            <SegmentCard title="Industry Rivalry" subtitle="Competition Intensity" bgFrom="#4f46e5" bgTo="#4338ca" icon="⚔️"
              defaultItems={["Competitor concentration", "Industry growth"]}
              populatedItems={ff.rivalry.points} isPopulated={ff.rivalry.populated} lang={lang}
              translatedItems={getTranslated("rivalry", ff.rivalry)} isTranslating={isTranslating("rivalry")} />
          </div>
          <div className="col-start-3 row-start-2">
            <SegmentCard title="Buyers" subtitle="Bargaining Power" bgFrom="#64748b" bgTo="#475569" icon="🤝"
              defaultItems={["Buyer concentration", "Price sensitivity"]}
              populatedItems={ff.buyers.points} isPopulated={ff.buyers.populated} lang={lang}
              translatedItems={getTranslated("buyers", ff.buyers)} isTranslating={isTranslating("buyers")} />
          </div>
          <div className="col-start-2 row-start-3">
            <SegmentCard title="Substitutes" subtitle="Threat" bgFrom="#64748b" bgTo="#475569" icon="🔄"
              defaultItems={["Substitute performance", "Cost of change"]}
              populatedItems={ff.substitutes.points} isPopulated={ff.substitutes.populated} lang={lang}
              translatedItems={getTranslated("substitutes", ff.substitutes)} isTranslating={isTranslating("substitutes")} />
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
function VRIOPane({ lang, getTranslated, requestTranslation, isTranslating }: TranslationProps) {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const vrio = portfolio.myAnalysis.vrio;

  useEffect(() => {
    requestTranslation("valuable", vrio.valuable);
    requestTranslation("rare", vrio.rare);
    requestTranslation("inimitable", vrio.inimitable);
    requestTranslation("organized", vrio.organized);
  }, [lang, vrio]);

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-[800px] mx-auto">
          <SegmentCard title="Valuable" subtitle="Is it?" bgFrom="#10b981" bgTo="#059669" icon="💎"
            defaultItems={["Do you offer value?"]} populatedItems={vrio.valuable.points} isPopulated={vrio.valuable.populated} lang={lang}
            translatedItems={getTranslated("valuable", vrio.valuable)} isTranslating={isTranslating("valuable")} />
          <SegmentCard title="Rare" subtitle="Is it?" bgFrom="#f59e0b" bgTo="#d97706" icon="🦄"
            defaultItems={["Do many others have it?"]} populatedItems={vrio.rare.points} isPopulated={vrio.rare.populated} lang={lang}
            translatedItems={getTranslated("rare", vrio.rare)} isTranslating={isTranslating("rare")} />
          <SegmentCard title="Inimitable" subtitle="Is it costly to copy?" bgFrom="#ef4444" bgTo="#dc2626" icon="🛡️"
            defaultItems={["Can it be easily copied?"]} populatedItems={vrio.inimitable.points} isPopulated={vrio.inimitable.populated} lang={lang}
            translatedItems={getTranslated("inimitable", vrio.inimitable)} isTranslating={isTranslating("inimitable")} />
          <SegmentCard title="Organized" subtitle="Are you?" bgFrom="#6366f1" bgTo="#4f46e5" icon="🧩"
            defaultItems={["Is the firm organized to exploit it?"]} populatedItems={vrio.organized.points} isPopulated={vrio.organized.populated} lang={lang}
            translatedItems={getTranslated("organized", vrio.organized)} isTranslating={isTranslating("organized")} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">VRIO Framework — Jay B. Barney</p>
      </div>
    </div>
  );
}

// ── SWOT ──
function SWOTPane({ lang, getTranslated, requestTranslation, isTranslating }: TranslationProps) {
  const { portfolio } = usePortfolio();
  if (!portfolio.myAnalysis) return null;
  const swot = portfolio.myAnalysis.swot;

  useEffect(() => {
    requestTranslation("strengths", swot.strengths);
    requestTranslation("weaknesses", swot.weaknesses);
    requestTranslation("opportunities", swot.opportunities);
    requestTranslation("threats", swot.threats);
  }, [lang, swot]);

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-[800px] mx-auto">
          <SegmentCard title="Strengths" subtitle="Internal Positive" bgFrom="#0d9488" bgTo="#0f766e" icon="💪"
            defaultItems={["What do you do well?"]} populatedItems={swot.strengths.points} isPopulated={swot.strengths.populated} lang={lang}
            translatedItems={getTranslated("strengths", swot.strengths)} isTranslating={isTranslating("strengths")} />
          <SegmentCard title="Weaknesses" subtitle="Internal Negative" bgFrom="#be123c" bgTo="#9f1239" icon="⚠️"
            defaultItems={["Where do you lack resources?"]} populatedItems={swot.weaknesses.points} isPopulated={swot.weaknesses.populated} lang={lang}
            translatedItems={getTranslated("weaknesses", swot.weaknesses)} isTranslating={isTranslating("weaknesses")} />
          <SegmentCard title="Opportunities" subtitle="External Positive" bgFrom="#0284c7" bgTo="#0369a1" icon="🚀"
            defaultItems={["What trends can you leverage?"]} populatedItems={swot.opportunities.points} isPopulated={swot.opportunities.populated} lang={lang}
            translatedItems={getTranslated("opportunities", swot.opportunities)} isTranslating={isTranslating("opportunities")} />
          <SegmentCard title="Threats" subtitle="External Negative" bgFrom="#b45309" bgTo="#92400e" icon="⚡"
            defaultItems={["What could harm you?"]} populatedItems={swot.threats.points} isPopulated={swot.threats.populated} lang={lang}
            translatedItems={getTranslated("threats", swot.threats)} isTranslating={isTranslating("threats")} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic">SWOT Analysis — Albert Humphrey</p>
      </div>
    </div>
  );
}

// ── Value Curve ──
const COMPETITOR_COLORS = ["#f59e0b", "#6366f1", "#10b981"];

function ValueCurvePane() {
  const { portfolio, updateValueCurve } = usePortfolio();
  const vc = portfolio.myAnalysis?.valueCurve;

  const [factors, setFactors] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [myScores, setMyScores] = useState<Record<string, number>>({});
  const [compScores, setCompScores] = useState<Record<string, Record<string, number>>>({});
  const [newFactor, setNewFactor] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [finalized, setFinalized] = useState(false);

  // Load from context on mount
  useEffect(() => {
    if (vc && vc.factors.length > 0) {
      const fNames = vc.factors.map((f: ValueCurveFactor) => f.name);
      setFactors(fNames);
      setCompetitors(vc.competitors || []);
      const ms: Record<string, number> = {};
      const cs: Record<string, Record<string, number>> = {};
      vc.factors.forEach((f: ValueCurveFactor) => {
        ms[f.name] = f.myScore;
        Object.entries(f.competitors).forEach(([comp, score]) => {
          if (!cs[comp]) cs[comp] = {};
          cs[comp][f.name] = score;
        });
      });
      setMyScores(ms);
      setCompScores(cs);
      setFinalized(vc.populated);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to context on every meaningful change
  const syncToContext = useCallback((f: string[], c: string[], ms: Record<string, number>, cs: Record<string, Record<string, number>>, pop: boolean) => {
    const vcFactors: ValueCurveFactor[] = f.map(name => ({
      name,
      myScore: ms[name] ?? 5,
      competitors: Object.fromEntries(c.map(comp => [comp, cs[comp]?.[name] ?? 5])),
    }));
    updateValueCurve({ factors: vcFactors, competitors: c, populated: pop });
  }, [updateValueCurve]);

  const addFactor = () => {
    const name = newFactor.trim();
    if (!name || factors.includes(name) || factors.length >= 8) return;
    const next = [...factors, name];
    const nextMs = { ...myScores, [name]: 5 };
    const nextCs = { ...compScores };
    competitors.forEach(c => {
      nextCs[c] = { ...(nextCs[c] || {}), [name]: 5 };
    });
    setFactors(next);
    setMyScores(nextMs);
    setCompScores(nextCs);
    setNewFactor("");
    syncToContext(next, competitors, nextMs, nextCs, false);
    setFinalized(false);
  };

  const removeFactor = (name: string) => {
    const next = factors.filter(f => f !== name);
    const nextMs = { ...myScores };
    delete nextMs[name];
    const nextCs = { ...compScores };
    Object.keys(nextCs).forEach(c => {
      const copy = { ...nextCs[c] };
      delete copy[name];
      nextCs[c] = copy;
    });
    setFactors(next);
    setMyScores(nextMs);
    setCompScores(nextCs);
    syncToContext(next, competitors, nextMs, nextCs, false);
    setFinalized(false);
  };

  const addCompetitor = () => {
    const name = newCompetitor.trim();
    if (!name || competitors.includes(name) || competitors.length >= 3) return;
    const next = [...competitors, name];
    const nextCs = { ...compScores, [name]: Object.fromEntries(factors.map(f => [f, 5])) };
    setCompetitors(next);
    setCompScores(nextCs);
    setNewCompetitor("");
    syncToContext(factors, next, myScores, nextCs, false);
    setFinalized(false);
  };

  const removeCompetitor = (name: string) => {
    const next = competitors.filter(c => c !== name);
    const nextCs = { ...compScores };
    delete nextCs[name];
    setCompetitors(next);
    setCompScores(nextCs);
    syncToContext(factors, next, myScores, nextCs, false);
    setFinalized(false);
  };

  const setMyScore = (factor: string, value: number) => {
    const nextMs = { ...myScores, [factor]: value };
    setMyScores(nextMs);
    syncToContext(factors, competitors, nextMs, compScores, false);
    setFinalized(false);
  };

  const setCompScore = (comp: string, factor: string, value: number) => {
    const nextCs = { ...compScores, [comp]: { ...(compScores[comp] || {}), [factor]: value } };
    setCompScores(nextCs);
    syncToContext(factors, competitors, myScores, nextCs, false);
    setFinalized(false);
  };

  const canFinalize = factors.length >= 3 && competitors.length >= 1;

  const handleFinalize = () => {
    if (!canFinalize) return;
    syncToContext(factors, competitors, myScores, compScores, true);
    setFinalized(true);
  };

  const handleEdit = () => {
    setFinalized(false);
    syncToContext(factors, competitors, myScores, compScores, false);
  };

  const showScoring = factors.length > 0 && competitors.length > 0;
  const showChart = factors.length >= 2;

  // ── SVG Chart ──
  const chartW = 600;
  const chartH = 300;
  const padL = 50;
  const padR = 30;
  const padT = 40;
  const padB = 60;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const xForIdx = (i: number) => padL + (factors.length > 1 ? (i / (factors.length - 1)) * plotW : plotW / 2);
  const yForScore = (s: number) => padT + plotH - ((s - 1) / 9) * plotH;

  const buildLine = (scores: number[]) =>
    scores.map((s, i) => `${i === 0 ? "M" : "L"}${xForIdx(i)},${yForScore(s)}`).join(" ");

  return (
    <div className="flex flex-col flex-1 pb-4 gap-5 overflow-y-auto">
      {/* ── Finalized Badge ── */}
      {finalized && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3">
          <span className="text-sm font-semibold text-emerald-700">✓ Value Curve Complete</span>
          <button onClick={handleEdit} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors">Edit</button>
        </div>
      )}

      {!finalized && (
        <>
          {/* ── Section 1: Competing Factors ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Competing Factors</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFactor}
                onChange={e => setNewFactor(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addFactor()}
                placeholder="e.g. Price, Quality, Speed…"
                maxLength={40}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
              <button
                onClick={addFactor}
                disabled={!newFactor.trim() || factors.length >= 8}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Add</button>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">Min 3, max 8 factors · {factors.length}/8 added</p>
            <div className="flex flex-wrap gap-2">
              {factors.map(f => (
                <span key={f} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  {f}
                  <button onClick={() => removeFactor(f)} className="text-slate-400 hover:text-red-500 ml-0.5 text-sm leading-none">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* ── Section 2: Competitors ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Competitors</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCompetitor}
                onChange={e => setNewCompetitor(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCompetitor()}
                placeholder="Competitor name…"
                maxLength={40}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
              <button
                onClick={addCompetitor}
                disabled={!newCompetitor.trim() || competitors.length >= 3}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Add</button>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">Min 1, max 3 competitors · {competitors.length}/3 added</p>
            <div className="flex flex-wrap gap-2">
              {competitors.map((c, i) => (
                <span key={c} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border" style={{ borderColor: COMPETITOR_COLORS[i], color: COMPETITOR_COLORS[i], backgroundColor: COMPETITOR_COLORS[i] + "10" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPETITOR_COLORS[i] }} />
                  {c}
                  <button onClick={() => removeCompetitor(c)} className="hover:text-red-500 ml-0.5 text-sm leading-none">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* ── Section 3: Scoring ── */}
          {showScoring && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Score Each Factor (1–10)</h3>
              <div className="space-y-5">
                {factors.map(factor => (
                  <div key={factor} className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">{factor}</p>
                    {/* My Business */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-indigo-600 w-24 truncate">My Business</span>
                      <input
                        type="range" min={1} max={10} value={myScores[factor] ?? 5}
                        onChange={e => setMyScore(factor, Number(e.target.value))}
                        className="flex-1 h-1.5 accent-indigo-500"
                      />
                      <span className="text-xs font-bold text-indigo-600 w-5 text-right">{myScores[factor] ?? 5}</span>
                    </div>
                    {/* Competitors */}
                    {competitors.map((comp, ci) => (
                      <div key={comp} className="flex items-center gap-3">
                        <span className="text-[11px] font-medium w-24 truncate" style={{ color: COMPETITOR_COLORS[ci] }}>{comp}</span>
                        <input
                          type="range" min={1} max={10} value={compScores[comp]?.[factor] ?? 5}
                          onChange={e => setCompScore(comp, factor, Number(e.target.value))}
                          className="flex-1 h-1.5"
                          style={{ accentColor: COMPETITOR_COLORS[ci] }}
                        />
                        <span className="text-xs font-bold w-5 text-right" style={{ color: COMPETITOR_COLORS[ci] }}>{compScores[comp]?.[factor] ?? 5}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 4: Live Chart ── */}
          {showChart && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Value Curve Chart</h3>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="w-3 h-0.5 rounded bg-indigo-500 inline-block" /> My Business
                </span>
                {competitors.map((c, i) => (
                  <span key={c} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: COMPETITOR_COLORS[i] }} /> {c}
                  </span>
                ))}
              </div>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 340 }}>
                {/* Grid lines */}
                {[1,2,3,4,5,6,7,8,9,10].map(v => (
                  <g key={v}>
                    <line x1={padL} x2={padL + plotW} y1={yForScore(v)} y2={yForScore(v)} stroke="#e2e8f0" strokeWidth={1} />
                    <text x={padL - 8} y={yForScore(v) + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">{v}</text>
                  </g>
                ))}
                {/* My Business line */}
                <path d={buildLine(factors.map(f => myScores[f] ?? 5))} fill="none" stroke="#6366f1" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                {factors.map((f, i) => (
                  <circle key={f} cx={xForIdx(i)} cy={yForScore(myScores[f] ?? 5)} r={5} fill="#6366f1" stroke="#fff" strokeWidth={2} />
                ))}
                {/* Competitor lines */}
                {competitors.map((comp, ci) => (
                  <g key={comp}>
                    <path d={buildLine(factors.map(f => compScores[comp]?.[f] ?? 5))} fill="none" stroke={COMPETITOR_COLORS[ci]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
                    {factors.map((f, i) => (
                      <circle key={f} cx={xForIdx(i)} cy={yForScore(compScores[comp]?.[f] ?? 5)} r={4} fill={COMPETITOR_COLORS[ci]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </g>
                ))}
                {/* X-axis labels */}
                {factors.map((f, i) => (
                  <text key={f} x={xForIdx(i)} y={chartH - 10} textAnchor="middle" className="text-[10px]" fill="#64748b" fontWeight={500}>
                    {f.length > 12 ? f.slice(0, 11) + "…" : f}
                  </text>
                ))}
              </svg>
            </div>
          )}

          {/* ── Section 5: Finalize ── */}
          <div className="flex justify-end">
            <button
              onClick={handleFinalize}
              disabled={!canFinalize}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Finalize Value Curve ✓
            </button>
          </div>
        </>
      )}

      {/* Show chart even when finalized */}
      {finalized && showChart && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Value Curve Chart</h3>
          <div className="flex flex-wrap gap-4 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-3 h-0.5 rounded bg-indigo-500 inline-block" /> My Business
            </span>
            {competitors.map((c, i) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: COMPETITOR_COLORS[i] }} /> {c}
              </span>
            ))}
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 340 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(v => (
              <g key={v}>
                <line x1={padL} x2={padL + plotW} y1={yForScore(v)} y2={yForScore(v)} stroke="#e2e8f0" strokeWidth={1} />
                <text x={padL - 8} y={yForScore(v) + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">{v}</text>
              </g>
            ))}
            <path d={buildLine(factors.map(f => myScores[f] ?? 5))} fill="none" stroke="#6366f1" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {factors.map((f, i) => (
              <circle key={f} cx={xForIdx(i)} cy={yForScore(myScores[f] ?? 5)} r={5} fill="#6366f1" stroke="#fff" strokeWidth={2} />
            ))}
            {competitors.map((comp, ci) => (
              <g key={comp}>
                <path d={buildLine(factors.map(f => compScores[comp]?.[f] ?? 5))} fill="none" stroke={COMPETITOR_COLORS[ci]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
                {factors.map((f, i) => (
                  <circle key={f} cx={xForIdx(i)} cy={yForScore(compScores[comp]?.[f] ?? 5)} r={4} fill={COMPETITOR_COLORS[ci]} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            ))}
            {factors.map((f, i) => (
              <text key={f} x={xForIdx(i)} y={chartH - 10} textAnchor="middle" className="text-[10px]" fill="#64748b" fontWeight={500}>
                {f.length > 12 ? f.slice(0, 11) + "…" : f}
              </text>
            ))}
          </svg>
        </div>
      )}

      <div className="mt-auto pt-2">
        <p className="text-[10px] text-slate-400 italic">Strategy Canvas — W. Chan Kim & Renée Mauborgne</p>
      </div>
    </div>
  );
}

// ── Main Export ──
export default function CanvasPane({ moduleId }: { moduleId: string }) {
  const { portfolio, setDiagramLanguage } = usePortfolio();
  const diagramLang = portfolio.myAnalysis?.diagramLanguage || "en";
  const chatLang = portfolio.myAnalysis?.chatLanguage || "en";
  const titleKey = MODULE_TITLES[moduleId] || "Business Model";
  const descKey = MODULE_DESCS[moduleId] || "bm-desc";

  const { getTranslated, requestTranslation, isTranslating } = useTranslatedPoints(diagramLang, chatLang);
  const translationProps = { lang: diagramLang, getTranslated, requestTranslation, isTranslating };

  const renderModuleContent = () => {
    switch (moduleId) {
      case "business-model": return <BusinessModelDiagram {...translationProps} />;
      case "external-analysis": return <FiveForcesPane {...translationProps} />;
      case "value-curve": return <ValueCurvePane />;
      case "internal-analysis": return <VRIOPane {...translationProps} />;
      case "swot-synthesis": return <SWOTPane {...translationProps} />;
      default: return <BusinessModelDiagram {...translationProps} />;
    }
  };

  return (
    <div className="h-full w-full p-6 flex flex-col overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="mb-3">
        {portfolio.myAnalysis && (
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: portfolio.myAnalysis.color }} />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{portfolio.myAnalysis.businessName}</span>
            </div>
            <LanguageToggle current={diagramLang} onChange={setDiagramLanguage} />
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t(titleKey, diagramLang)}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t(descKey, diagramLang)}</p>
      </div>
      {renderModuleContent()}
    </div>
  );
}
