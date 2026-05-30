import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

const ai = new GoogleGenAI({});

// ── Colors ──
const CLR = {
  darkSlate: "1E293B",
  slate700: "334155",
  slate500: "64748B",
  slate400: "94A3B8",
  slate200: "E2E8F0",
  slate100: "F1F5F9",
  white: "FFFFFF",
  blue: "3B82F6",
  blue50: "EFF6FF",
  red: "EF4444",
  red50: "FEF2F2",
  emerald: "10B981",
  emerald50: "ECFDF5",
  amber: "F59E0B",
  amber50: "FFFBEB",
  orange: "F97316",
  indigo: "6366F1",
  purple: "8B5CF6",
  galp_red: "E8634A",
};

function getGradeInfo(score: number) {
  if (score >= 80) return { grade: "A", color: CLR.emerald };
  if (score >= 65) return { grade: "B", color: CLR.blue };
  if (score >= 50) return { grade: "C", color: CLR.amber };
  if (score >= 35) return { grade: "D", color: CLR.orange };
  return { grade: "F", color: CLR.red };
}

// ── Story card type ──
interface StoryCard {
  icon: string;   // e.g. emoji or short label
  label: string;  // e.g. "WHO WE SERVE"
  summary: string; // one-liner
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysis, aiScores } = body;

    if (!analysis || !aiScores) {
      return NextResponse.json({ error: "Missing analysis or aiScores" }, { status: 400 });
    }

    // ── Step 1: Call Gemini for English story content ──
    const frameworkSummary = buildFrameworkSummary(analysis, aiScores);
    const slideContent = await generateSlideContent(frameworkSummary);

    // ── Step 2: Build the PPTX ──
    const pptxBuffer = await buildPPTX(slideContent, aiScores, analysis);

    // ── Step 3: Return as downloadable binary ──
    const fileName = `${analysis.businessName.replace(/[^a-zA-Z0-9]/g, "_")}_Strategy_Slides.pptx`;
    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Generate slides error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate slides" },
      { status: 500 }
    );
  }
}

// ════════════════════════════════════════
// Gemini: Generate story-format content
// ════════════════════════════════════════
async function generateSlideContent(frameworkSummary: string) {
  const prompt = `You are a senior strategy consultant helping a leadership program participant present their business analysis to their team for the first time.

The goal is to help the AUDIENCE quickly understand this person's business through 4 strategic frameworks. Each framework should be distilled into easy-to-understand story cards.

IMPORTANT: All content MUST be in English regardless of the original analysis language. This is for SHARING FINDINGS to help others understand the business — NOT for Q&A or challenging.

## Analysis Data
${frameworkSummary}

## Instructions

### For "businessModel" — generate 3 storyCards:
Each card tells a part of the business model story:
- Card 1: label="WHO WE SERVE", summary=one sentence about customers and what products/services are offered (max 20 words)
- Card 2: label="HOW WE DELIVER", summary=one sentence about the value chain, key activities, partners, and resources (max 20 words)  
- Card 3: label="WHAT IT GENERATES", summary=one sentence about financial, environmental, and societal contributions (max 20 words)

### For "fiveForces" — generate 3 storyCards:
Distill the 5 forces into a competitive landscape story:
- Card 1: label="BIGGEST THREAT", summary=which force is most dangerous and why (max 20 words)
- Card 2: label="COMPETITIVE LANDSCAPE", summary=the overall competitive dynamic — what drives rivalry (max 20 words)
- Card 3: label="WHERE WE'RE SHIELDED", summary=which forces are least threatening and why (max 20 words)

### For "vrio" — generate 4 storyCards:
Tell the resource advantage story through the VRIO filter:
- Card 1: label="WHAT'S VALUABLE", summary=the key resources/capabilities that create value (max 20 words)
- Card 2: label="WHAT'S TRULY RARE", summary=what sets this business apart from competitors honestly (max 20 words)
- Card 3: label="WHAT'S HARD TO COPY", summary=why competitors can't easily replicate these advantages (max 20 words)
- Card 4: label="HOW WE'RE ORGANIZED", summary=whether the organization is set up to exploit these advantages (max 20 words)

### For "swot" — generate 4 storyCards:
Synthesize the strategic position:
- Card 1: label="WHERE WE'RE STRONG", summary=the key internal strengths (max 20 words)
- Card 2: label="WHERE WE'RE EXPOSED", summary=the key internal weaknesses honestly (max 20 words)
- Card 3: label="WHAT'S AHEAD", summary=the most promising external opportunities (max 20 words)
- Card 4: label="WHAT'S AT RISK", summary=the most serious external threats (max 20 words)

### For each framework also generate:
- **headline**: A clear informative one-liner summarizing the key finding (max 15 words)
- **synthesis**: A one-sentence "so what?" takeaway

### Also generate overall:
- **overallSynthesis**: 2-sentence strategic narrative connecting all 4 frameworks
- **keyStrength**: The single most important strength (one sentence)
- **keyChallenge**: The single most important challenge (one sentence)

## Required JSON Format (respond with ONLY valid JSON):
{
  "businessModel": {
    "headline": "...",
    "storyCards": [
      { "label": "WHO WE SERVE", "summary": "..." },
      { "label": "HOW WE DELIVER", "summary": "..." },
      { "label": "WHAT IT GENERATES", "summary": "..." }
    ],
    "synthesis": "..."
  },
  "fiveForces": {
    "headline": "...",
    "storyCards": [
      { "label": "BIGGEST THREAT", "summary": "..." },
      { "label": "COMPETITIVE LANDSCAPE", "summary": "..." },
      { "label": "WHERE WE'RE SHIELDED", "summary": "..." }
    ],
    "synthesis": "..."
  },
  "vrio": {
    "headline": "...",
    "storyCards": [
      { "label": "WHAT'S VALUABLE", "summary": "..." },
      { "label": "WHAT'S TRULY RARE", "summary": "..." },
      { "label": "WHAT'S HARD TO COPY", "summary": "..." },
      { "label": "HOW WE'RE ORGANIZED", "summary": "..." }
    ],
    "synthesis": "..."
  },
  "swot": {
    "headline": "...",
    "storyCards": [
      { "label": "WHERE WE'RE STRONG", "summary": "..." },
      { "label": "WHERE WE'RE EXPOSED", "summary": "..." },
      { "label": "WHAT'S AHEAD", "summary": "..." },
      { "label": "WHAT'S AT RISK", "summary": "..." }
    ],
    "synthesis": "..."
  },
  "overallSynthesis": "...",
  "keyStrength": "...",
  "keyChallenge": "..."
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.6,
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "";
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ════════════════════════════════════════
// Build PPTX
// ════════════════════════════════════════
async function buildPPTX(
  slideContent: any,
  aiScores: any,
  analysis: any,
): Promise<Buffer> {
  const businessName = analysis.businessName;
  const ownerName = analysis.ownerName;
  const ownerRegion = analysis.ownerRegion || "N/A";

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Strategy Coach";
  pptx.title = `${businessName} — Strategic Analysis`;

  // ══════════════════════════════
  // SLIDE 1: TITLE
  // ══════════════════════════════
  const slide1 = pptx.addSlide();
  slide1.background = { color: CLR.darkSlate };
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: CLR.galp_red } });

  slide1.addText("STRATEGIC ANALYSIS", {
    x: 0.8, y: 1.0, w: 7, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: CLR.slate400,
  });
  slide1.addText(businessName, {
    x: 0.8, y: 1.5, w: 7.5, h: 0.9,
    fontSize: 36, fontFace: "Arial", color: CLR.white, bold: true,
  });
  slide1.addText(`${ownerName}  \u00B7  ${ownerRegion}`, {
    x: 0.8, y: 2.5, w: 7, h: 0.4,
    fontSize: 14, fontFace: "Arial", color: CLR.slate400,
  });
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  slide1.addText(dateStr, {
    x: 0.8, y: 3.0, w: 7, h: 0.3,
    fontSize: 11, fontFace: "Arial", color: CLR.slate500,
  });

  // Health score badge
  const { grade, color: gradeColor } = getGradeInfo(aiScores.healthScore);
  slide1.addShape(pptx.ShapeType.roundRect, {
    x: 8.0, y: 1.3, w: 1.4, h: 1.6,
    fill: { color: gradeColor }, rectRadius: 0.15,
  });
  slide1.addText(grade, {
    x: 8.0, y: 1.35, w: 1.4, h: 1.1,
    fontSize: 48, fontFace: "Arial", color: CLR.white, bold: true,
    align: "center", valign: "middle",
  });
  slide1.addText(`${aiScores.healthScore}/100`, {
    x: 8.0, y: 2.4, w: 1.4, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: CLR.white,
    align: "center", valign: "middle",
  });

  // Divider
  slide1.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 3.6, w: 8.4, h: 0,
    line: { color: CLR.slate500, width: 0.5, dashType: "dash" },
  });

  // Business description
  const desc = analysis.businessDescription || "";
  const descShort = desc.length > 200 ? desc.substring(0, 197) + "..." : desc;
  if (descShort) {
    slide1.addText(descShort, {
      x: 0.8, y: 3.8, w: 8.4, h: 0.7,
      fontSize: 12, fontFace: "Arial", color: CLR.slate400, italic: true,
    });
  }

  addFooter(slide1, pptx, businessName, ownerName);

  // ── Icon map for story cards ──
  const iconMap: Record<string, string> = {
    "WHO WE SERVE": "\uD83D\uDC65",        // 👥
    "HOW WE DELIVER": "\u2699\uFE0F",       // ⚙️
    "WHAT IT GENERATES": "\uD83D\uDCB0",    // 💰
    "BIGGEST THREAT": "\u26A0\uFE0F",        // ⚠️
    "COMPETITIVE LANDSCAPE": "\u2694\uFE0F", // ⚔️
    "WHERE WE'RE SHIELDED": "\uD83D\uDEE1\uFE0F", // 🛡️
    "WHAT'S VALUABLE": "\uD83D\uDCA1",      // 💡
    "WHAT'S TRULY RARE": "\uD83D\uDC8E",    // 💎
    "WHAT'S HARD TO COPY": "\uD83D\uDD12",  // 🔒
    "HOW WE'RE ORGANIZED": "\uD83C\uDFD7\uFE0F", // 🏗️
    "WHERE WE'RE STRONG": "\uD83D\uDCAA",   // 💪
    "WHERE WE'RE EXPOSED": "\uD83D\uDD34",  // 🔴
    "WHAT'S AHEAD": "\uD83D\uDE80",         // 🚀
    "WHAT'S AT RISK": "\u26A1",              // ⚡
  };

  // ══════════════════════════════
  // SLIDE 2: BUSINESS MODEL
  // ══════════════════════════════
  buildFrameworkSlide(pptx, {
    frameworkLabel: "BUSINESS MODEL",
    frameworkSub: "Odyssey 3.14",
    accentColor: CLR.blue,
    accentLight: CLR.blue50,
    headline: slideContent.businessModel?.headline || "Business Model Overview",
    storyCards: (slideContent.businessModel?.storyCards || []).map((c: any) => ({
      ...c, icon: iconMap[c.label] || "\u2726",
    })),
    synthesis: slideContent.businessModel?.synthesis || "",
    businessName, ownerName,
  });

  // ══════════════════════════════
  // SLIDE 3: FIVE FORCES
  // ══════════════════════════════
  buildFrameworkSlide(pptx, {
    frameworkLabel: "COMPETITIVE PRESSURE",
    frameworkSub: "Porter's 5 Forces",
    accentColor: CLR.red,
    accentLight: CLR.red50,
    headline: slideContent.fiveForces?.headline || "External Competitive Landscape",
    storyCards: (slideContent.fiveForces?.storyCards || []).map((c: any) => ({
      ...c, icon: iconMap[c.label] || "\u2726",
    })),
    synthesis: slideContent.fiveForces?.synthesis || "",
    businessName, ownerName,
  });

  // ══════════════════════════════
  // SLIDE 4: VRIO
  // ══════════════════════════════
  buildFrameworkSlide(pptx, {
    frameworkLabel: "RESOURCE ADVANTAGE",
    frameworkSub: "VRIO Framework",
    accentColor: CLR.emerald,
    accentLight: CLR.emerald50,
    headline: slideContent.vrio?.headline || "Internal Resource Analysis",
    storyCards: (slideContent.vrio?.storyCards || []).map((c: any) => ({
      ...c, icon: iconMap[c.label] || "\u2726",
    })),
    synthesis: slideContent.vrio?.synthesis || "",
    businessName, ownerName,
  });

  // ══════════════════════════════
  // SLIDE 5: SWOT
  // ══════════════════════════════
  buildFrameworkSlide(pptx, {
    frameworkLabel: "STRATEGIC POSITION",
    frameworkSub: "SWOT Synthesis",
    accentColor: CLR.amber,
    accentLight: CLR.amber50,
    headline: slideContent.swot?.headline || "Strategic Position Summary",
    storyCards: (slideContent.swot?.storyCards || []).map((c: any) => ({
      ...c, icon: iconMap[c.label] || "\u2726",
    })),
    synthesis: slideContent.swot?.synthesis || "",
    businessName, ownerName,
  });

  // ══════════════════════════════
  // SLIDE 6: STRATEGIC SUMMARY
  // ══════════════════════════════
  const slide6 = pptx.addSlide();
  slide6.background = { color: CLR.darkSlate };
  slide6.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: CLR.indigo } });

  slide6.addText("STRATEGIC SUMMARY", {
    x: 0.8, y: 0.4, w: 8.4, h: 0.35,
    fontSize: 11, fontFace: "Arial", color: CLR.indigo, bold: true,
  });
  slide6.addText(businessName, {
    x: 0.8, y: 0.7, w: 8.4, h: 0.35,
    fontSize: 16, fontFace: "Arial", color: CLR.white, bold: true,
  });

  // Overall synthesis
  slide6.addText(slideContent.overallSynthesis || "", {
    x: 0.8, y: 1.4, w: 8.4, h: 0.8,
    fontSize: 14, fontFace: "Arial", color: CLR.slate400, italic: true,
  });

  // Key Strength box
  slide6.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 2.5, w: 4.0, h: 1.3,
    fill: { color: "0F3A2A" }, rectRadius: 0.1,
    line: { color: CLR.emerald, width: 1 },
  });
  slide6.addText("\u2191 KEY STRENGTH", {
    x: 1.0, y: 2.6, w: 3.6, h: 0.3,
    fontSize: 9, fontFace: "Arial", color: CLR.emerald, bold: true,
  });
  slide6.addText(slideContent.keyStrength || "", {
    x: 1.0, y: 2.95, w: 3.6, h: 0.75,
    fontSize: 12, fontFace: "Arial", color: CLR.white,
    valign: "top",
  });

  // Key Challenge box
  slide6.addShape(pptx.ShapeType.roundRect, {
    x: 5.2, y: 2.5, w: 4.0, h: 1.3,
    fill: { color: "3B1318" }, rectRadius: 0.1,
    line: { color: CLR.red, width: 1 },
  });
  slide6.addText("\u2193 KEY CHALLENGE", {
    x: 5.4, y: 2.6, w: 3.6, h: 0.3,
    fontSize: 9, fontFace: "Arial", color: CLR.red, bold: true,
  });
  slide6.addText(slideContent.keyChallenge || "", {
    x: 5.4, y: 2.95, w: 3.6, h: 0.75,
    fontSize: 12, fontFace: "Arial", color: CLR.white,
    valign: "top",
  });

  // Health score recap
  slide6.addShape(pptx.ShapeType.roundRect, {
    x: 3.8, y: 4.1, w: 2.4, h: 0.7,
    fill: { color: gradeColor }, rectRadius: 0.1,
  });
  slide6.addText(`Health Score: ${grade}  (${aiScores.healthScore}/100)`, {
    x: 3.8, y: 4.1, w: 2.4, h: 0.7,
    fontSize: 13, fontFace: "Arial", color: CLR.white, bold: true,
    align: "center", valign: "middle",
  });

  addFooter(slide6, pptx, businessName, ownerName);

  // ── Write to buffer ──
  const data = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return data;
}

// ════════════════════════════════════════
// Framework slide template (story cards)
// ════════════════════════════════════════
interface FrameworkConfig {
  frameworkLabel: string;
  frameworkSub: string;
  accentColor: string;
  accentLight: string;
  headline: string;
  storyCards: StoryCard[];
  synthesis: string;
  businessName: string;
  ownerName: string;
}

function buildFrameworkSlide(pptx: PptxGenJS, cfg: FrameworkConfig) {
  const slide = pptx.addSlide();
  slide.background = { color: CLR.white };

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: cfg.accentColor } });

  // Framework label + sub (full width)
  slide.addText(cfg.frameworkLabel, {
    x: 0.6, y: 0.3, w: 5, h: 0.35,
    fontSize: 11, fontFace: "Arial", color: cfg.accentColor, bold: true,
  });
  slide.addText(cfg.frameworkSub, {
    x: 0.6, y: 0.6, w: 5, h: 0.25,
    fontSize: 10, fontFace: "Arial", color: CLR.slate400,
  });

  // Headline (full width, right-aligned area)
  slide.addText("\u2726", {
    x: 5.0, y: 0.3, w: 0.3, h: 0.35,
    fontSize: 14, color: cfg.accentColor,
  });
  slide.addText(cfg.headline, {
    x: 5.3, y: 0.3, w: 4.3, h: 0.55,
    fontSize: 14, fontFace: "Arial", color: CLR.darkSlate, bold: true,
    valign: "top",
  });

  // ── STORY CARDS (left side, stacked vertically) ──
  const cardX = 0.5;
  const cardW = 4.3;
  const cards = (cfg.storyCards || []).slice(0, 4);
  const cardCount = cards.length;
  // Dynamic card height based on number of cards
  const totalH = 3.7; // available height for cards
  const cardGap = 0.1;
  const cardH = (totalH - (cardCount - 1) * cardGap) / cardCount;
  const startY = 1.1;

  cards.forEach((card, i) => {
    const cy = startY + i * (cardH + cardGap);

    // Card background
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cardX, y: cy, w: cardW, h: cardH,
      fill: { color: CLR.slate100 }, rectRadius: 0.08,
      line: { color: CLR.slate200, width: 0.5 },
    });

    // Accent left strip
    slide.addShape(pptx.ShapeType.rect, {
      x: cardX, y: cy, w: 0.06, h: cardH,
      fill: { color: cfg.accentColor },
    });

    // Icon
    slide.addText(card.icon || "\u2726", {
      x: cardX + 0.15, y: cy + 0.05, w: 0.35, h: 0.3,
      fontSize: 14,
    });

    // Label
    slide.addText(card.label, {
      x: cardX + 0.5, y: cy + 0.08, w: cardW - 0.7, h: 0.22,
      fontSize: 8, fontFace: "Arial", color: cfg.accentColor, bold: true,
    });

    // Summary text
    slide.addText(card.summary, {
      x: cardX + 0.5, y: cy + 0.32, w: cardW - 0.7, h: cardH - 0.4,
      fontSize: 11, fontFace: "Arial", color: CLR.slate700,
      valign: "top",
    });
  });

  // ── RIGHT SIDE: Synthesis ──
  const rightX = 5.0;
  const rightW = 4.6;

  // "SO WHAT?" synthesis card
  const synthY = 1.1;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: rightX - 0.1, y: synthY, w: rightW + 0.2, h: 1.0,
    fill: { color: cfg.accentLight }, rectRadius: 0.1,
  });
  slide.addText("SO WHAT DOES THIS MEAN?", {
    x: rightX, y: synthY + 0.08, w: rightW, h: 0.2,
    fontSize: 8, fontFace: "Arial", color: cfg.accentColor, bold: true,
  });
  slide.addText(cfg.synthesis, {
    x: rightX, y: synthY + 0.3, w: rightW, h: 0.65,
    fontSize: 12, fontFace: "Arial", color: CLR.darkSlate,
    valign: "top",
  });

  // Presenter note area (subtle guide for what to SAY)
  const noteY = 2.4;
  slide.addShape(pptx.ShapeType.line, {
    x: rightX, y: noteY, w: rightW, h: 0,
    line: { color: CLR.slate200, width: 0.5, dashType: "dash" },
  });
  slide.addText("PRESENTER NOTES", {
    x: rightX, y: noteY + 0.15, w: rightW, h: 0.2,
    fontSize: 7, fontFace: "Arial", color: CLR.slate400, bold: true,
  });
  slide.addText("Use the story cards on the left as anchors.\nRead the label, then elaborate with your own\nknowledge and examples.", {
    x: rightX, y: noteY + 0.4, w: rightW, h: 0.8,
    fontSize: 9, fontFace: "Arial", color: CLR.slate400, italic: true,
  });

  addFooter(slide, pptx, cfg.businessName, cfg.ownerName);
}

// ── Footer ──
function addFooter(slide: any, pptx: PptxGenJS, businessName: string, ownerName: string) {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 5.05, w: 9.0, h: 0,
    line: { color: CLR.slate200, width: 0.5 },
  });
  slide.addText(`Strategy Coach  \u00B7  ${businessName}  \u00B7  ${ownerName}`, {
    x: 0.5, y: 5.1, w: 7, h: 0.25,
    fontSize: 8, fontFace: "Arial", color: CLR.slate400,
  });
  slide.addText("Confidential", {
    x: 7.5, y: 5.1, w: 2, h: 0.25,
    fontSize: 8, fontFace: "Arial", color: CLR.slate400, align: "right",
  });
}

// ── Framework summary builder ──
function buildFrameworkSummary(analysis: any, aiScores: any): string {
  const sections: string[] = [];

  const bm = analysis.businessModel;
  const bmScores = aiScores.businessModel;
  sections.push(`### Business Model (Odyssey 3.14)
- Value Proposition (${bmScores.valueProposition.score}/5): ${bmScores.valueProposition.insight}
  Points: ${bm.valueProposition?.points?.join("; ") || "N/A"}
- Value Architecture (${bmScores.valueArchitecture.score}/5): ${bmScores.valueArchitecture.insight}
  Points: ${bm.valueArchitecture?.points?.join("; ") || "N/A"}
- Contributions (${bmScores.contributions.score}/5): ${bmScores.contributions.insight}
  Points: ${bm.contributions?.points?.join("; ") || "N/A"}`);

  const ff = aiScores.fiveForces;
  const ffData = analysis.fiveForces;
  sections.push(`### Competitive Pressure (Porter's 5 Forces)
- New Entrants: ${ff.newEntrants.severity}/10 (${ff.newEntrants.label}). Points: ${ffData.newEntrants?.points?.join("; ") || "N/A"}
- Suppliers: ${ff.suppliers.severity}/10 (${ff.suppliers.label}). Points: ${ffData.suppliers?.points?.join("; ") || "N/A"}
- Rivalry: ${ff.rivalry.severity}/10 (${ff.rivalry.label}). Points: ${ffData.rivalry?.points?.join("; ") || "N/A"}
- Buyers: ${ff.buyers.severity}/10 (${ff.buyers.label}). Points: ${ffData.buyers?.points?.join("; ") || "N/A"}
- Substitutes: ${ff.substitutes.severity}/10 (${ff.substitutes.label}). Points: ${ffData.substitutes?.points?.join("; ") || "N/A"}
- Overall Industry Attractiveness: ${ff.overallAttractiveness}`);

  const vr = aiScores.vrio;
  const vrData = analysis.vrio;
  sections.push(`### Resource Advantage (VRIO)
- Valuable (${vr.valuable.strength}/5): ${vr.valuable.insight}. Points: ${vrData.valuable?.points?.join("; ") || "N/A"}
- Rare (${vr.rare.strength}/5): ${vr.rare.insight}. Points: ${vrData.rare?.points?.join("; ") || "N/A"}
- Inimitable (${vr.inimitable.strength}/5): ${vr.inimitable.insight}. Points: ${vrData.inimitable?.points?.join("; ") || "N/A"}
- Organized (${vr.organized.strength}/5): ${vr.organized.insight}. Points: ${vrData.organized?.points?.join("; ") || "N/A"}
- Competitive Advantage: ${vr.competitiveAdvantage}`);

  const sw = aiScores.swot;
  const swData = analysis.swot;
  sections.push(`### Strategic Position (SWOT)
- Strengths (${sw.strengthsWeight}/10): ${swData.strengths?.points?.join("; ") || "N/A"}
- Weaknesses (${sw.weaknessesWeight}/10): ${swData.weaknesses?.points?.join("; ") || "N/A"}
- Opportunities (${sw.opportunitiesWeight}/10): ${swData.opportunities?.points?.join("; ") || "N/A"}
- Threats (${sw.threatsWeight}/10): ${swData.threats?.points?.join("; ") || "N/A"}`);

  sections.push(`### Overall
- Health Score: ${aiScores.healthScore}/100
- Narrative: ${aiScores.narrative}
- Business Name: ${analysis.businessName}
- Owner: ${analysis.ownerName}
- Region: ${analysis.ownerRegion || "N/A"}
- Business Description: ${analysis.businessDescription || "N/A"}`);

  return sections.join("\n\n");
}
