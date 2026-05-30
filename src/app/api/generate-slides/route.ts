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

function getBarColor(value: number, max: number): string {
  const pct = value / max;
  if (pct >= 0.8) return CLR.emerald;
  if (pct >= 0.6) return CLR.blue;
  if (pct >= 0.4) return CLR.amber;
  if (pct >= 0.2) return CLR.orange;
  return CLR.red;
}

function getThreatColor(severity: number): string {
  if (severity <= 3) return CLR.emerald;
  if (severity <= 6) return CLR.amber;
  if (severity <= 8) return CLR.orange;
  return CLR.red;
}

function starsText(score: number, max: number = 5): string {
  return "\u2605".repeat(score) + "\u2606".repeat(max - score);
}

// ── Score item type ──
interface ScoreItem {
  label: string;
  value: string;
  barPct: number;
  barColor: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysis, aiScores } = body;

    if (!analysis || !aiScores) {
      return NextResponse.json({ error: "Missing analysis or aiScores" }, { status: 400 });
    }

    // ── Step 1: Call Gemini for provocative slide content ──
    const frameworkSummary = buildFrameworkSummary(analysis, aiScores);
    const slideContent = await generateSlideContent(frameworkSummary);

    // ── Step 2: Build the PPTX server-side ──
    const pptxBuffer = await buildPPTX(
      slideContent,
      aiScores,
      analysis.businessName,
      analysis.ownerName,
      analysis.ownerRegion || "N/A"
    );

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
// Gemini: Generate provocative content
// ════════════════════════════════════════
async function generateSlideContent(frameworkSummary: string) {
  const prompt = `You are a senior strategy consultant creating presentation slides for a leadership program participant.

Based on the following strategic analysis, generate EXACTLY the JSON structure below. All content MUST be in English regardless of the original analysis language.

## Analysis Data
${frameworkSummary}

## Instructions
For each of the 4 frameworks, generate:
1. **headline**: A bold, provocative one-line insight (NOT a topic label). It should capture the most important finding. Examples: "Our network advantage is real — but not as rare as we think", "Supplier power is our Achilles heel". Maximum 12 words.
2. **tension**: An "uncomfortable truth" — one specific tension, vulnerability, or contradiction the AI found in the analysis. 1-2 sentences. Start with a specific observation, not generic advice.
3. **question**: A discussion question for the presenter's team members. Should provoke debate and be answerable from different division perspectives. Start with "How might..." or "What if..." or "Where do you see...". One sentence.

Also generate:
4. **finalChallenge**: For the last slide — a single powerful question that connects this individual's analysis to the team's collective challenge. Should inspire cross-divisional thinking. 1-2 sentences.
5. **finalContext**: A brief framing sentence for why this question matters to the team. One sentence.

## Required JSON Format (respond with ONLY valid JSON, no markdown fences):
{
  "businessModel": {
    "headline": "...",
    "tension": "...",
    "question": "..."
  },
  "fiveForces": {
    "headline": "...",
    "tension": "...",
    "question": "..."
  },
  "vrio": {
    "headline": "...",
    "tension": "...",
    "question": "..."
  },
  "swot": {
    "headline": "...",
    "tension": "...",
    "question": "..."
  },
  "finalChallenge": "...",
  "finalContext": "..."
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.8,
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
// Build PPTX (server-side)
// ════════════════════════════════════════
async function buildPPTX(
  slideContent: any,
  aiScores: any,
  businessName: string,
  ownerName: string,
  ownerRegion: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Strategy Coach";
  pptx.title = `${businessName} — Strategic Analysis`;

  // ── SLIDE 1: TITLE ──
  const slide1 = pptx.addSlide();
  slide1.background = { color: CLR.darkSlate };
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: CLR.galp_red } });

  slide1.addText("STRATEGIC ANALYSIS", {
    x: 0.8, y: 1.2, w: 7, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: CLR.slate400, bold: false,
  });
  slide1.addText(businessName, {
    x: 0.8, y: 1.7, w: 7.5, h: 0.9,
    fontSize: 36, fontFace: "Arial", color: CLR.white, bold: true,
  });
  slide1.addText(`${ownerName}  \u00B7  ${ownerRegion}`, {
    x: 0.8, y: 2.7, w: 7, h: 0.4,
    fontSize: 14, fontFace: "Arial", color: CLR.slate400,
  });
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  slide1.addText(dateStr, {
    x: 0.8, y: 3.2, w: 7, h: 0.3,
    fontSize: 11, fontFace: "Arial", color: CLR.slate500,
  });

  // Health score badge
  const { grade, color: gradeColor } = getGradeInfo(aiScores.healthScore);
  slide1.addShape(pptx.ShapeType.roundRect, {
    x: 8.0, y: 1.5, w: 1.4, h: 1.6,
    fill: { color: gradeColor }, rectRadius: 0.15,
  });
  slide1.addText(grade, {
    x: 8.0, y: 1.55, w: 1.4, h: 1.1,
    fontSize: 48, fontFace: "Arial", color: CLR.white, bold: true,
    align: "center", valign: "middle",
  });
  slide1.addText(`${aiScores.healthScore}/100`, {
    x: 8.0, y: 2.6, w: 1.4, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: CLR.white,
    align: "center", valign: "middle",
  });

  // Divider
  slide1.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 3.8, w: 8.4, h: 0,
    line: { color: CLR.slate500, width: 0.5, dashType: "dash" },
  });

  // Narrative
  const narrativeShort = (aiScores.narrative || "").length > 250
    ? aiScores.narrative.substring(0, 247) + "..."
    : aiScores.narrative || "";
  slide1.addText(narrativeShort, {
    x: 0.8, y: 4.0, w: 8.4, h: 1.0,
    fontSize: 12, fontFace: "Arial", color: CLR.slate400, italic: true,
  });
  addFooter(slide1, pptx, businessName, ownerName);

  // ── SLIDE 2: Business Model ──
  buildFrameworkSlide(pptx, {
    frameworkLabel: "BUSINESS MODEL",
    frameworkSub: "Odyssey 3.14",
    accentColor: CLR.blue,
    accentLight: CLR.blue50,
    headline: slideContent.businessModel?.headline || "Business Model Analysis",
    tension: slideContent.businessModel?.tension || "",
    question: slideContent.businessModel?.question || "",
    scores: [
      { label: "Value Proposition", value: starsText(aiScores.businessModel.valueProposition.score), barPct: (aiScores.businessModel.valueProposition.score / 5) * 100, barColor: getBarColor(aiScores.businessModel.valueProposition.score, 5) },
      { label: "Value Architecture", value: starsText(aiScores.businessModel.valueArchitecture.score), barPct: (aiScores.businessModel.valueArchitecture.score / 5) * 100, barColor: getBarColor(aiScores.businessModel.valueArchitecture.score, 5) },
      { label: "Contributions", value: starsText(aiScores.businessModel.contributions.score), barPct: (aiScores.businessModel.contributions.score / 5) * 100, barColor: getBarColor(aiScores.businessModel.contributions.score, 5) },
    ],
    businessName, ownerName,
  });

  // ── SLIDE 3: Five Forces ──
  const forces = [
    { label: "New Entrants", severity: aiScores.fiveForces.newEntrants.severity },
    { label: "Suppliers", severity: aiScores.fiveForces.suppliers.severity },
    { label: "Rivalry", severity: aiScores.fiveForces.rivalry.severity },
    { label: "Buyers", severity: aiScores.fiveForces.buyers.severity },
    { label: "Substitutes", severity: aiScores.fiveForces.substitutes.severity },
  ];
  buildFrameworkSlide(pptx, {
    frameworkLabel: "COMPETITIVE PRESSURE",
    frameworkSub: "Porter's 5 Forces",
    accentColor: CLR.red,
    accentLight: CLR.red50,
    headline: slideContent.fiveForces?.headline || "Competitive Pressure Analysis",
    tension: slideContent.fiveForces?.tension || "",
    question: slideContent.fiveForces?.question || "",
    scores: forces.map(f => ({
      label: f.label,
      value: `${f.severity}/10`,
      barPct: (f.severity / 10) * 100,
      barColor: getThreatColor(f.severity),
    })),
    businessName, ownerName,
  });

  // ── SLIDE 4: VRIO ──
  const vrioItems = [
    { label: "Valuable", strength: aiScores.vrio.valuable.strength },
    { label: "Rare", strength: aiScores.vrio.rare.strength },
    { label: "Inimitable", strength: aiScores.vrio.inimitable.strength },
    { label: "Organized", strength: aiScores.vrio.organized.strength },
  ];
  buildFrameworkSlide(pptx, {
    frameworkLabel: "RESOURCE ADVANTAGE",
    frameworkSub: "VRIO Framework",
    accentColor: CLR.emerald,
    accentLight: CLR.emerald50,
    headline: slideContent.vrio?.headline || "Resource Advantage Analysis",
    tension: slideContent.vrio?.tension || "",
    question: slideContent.vrio?.question || "",
    scores: vrioItems.map(v => ({
      label: v.label,
      value: `${v.strength}/5`,
      barPct: (v.strength / 5) * 100,
      barColor: getBarColor(v.strength, 5),
    })),
    businessName, ownerName,
  });

  // ── SLIDE 5: SWOT ──
  buildFrameworkSlide(pptx, {
    frameworkLabel: "STRATEGIC POSITION",
    frameworkSub: "SWOT Synthesis",
    accentColor: CLR.amber,
    accentLight: CLR.amber50,
    headline: slideContent.swot?.headline || "Strategic Position Analysis",
    tension: slideContent.swot?.tension || "",
    question: slideContent.swot?.question || "",
    scores: [
      { label: "Strengths", value: `${aiScores.swot.strengthsWeight}/10`, barPct: aiScores.swot.strengthsWeight * 10, barColor: CLR.emerald },
      { label: "Weaknesses", value: `${aiScores.swot.weaknessesWeight}/10`, barPct: aiScores.swot.weaknessesWeight * 10, barColor: CLR.red },
      { label: "Opportunities", value: `${aiScores.swot.opportunitiesWeight}/10`, barPct: aiScores.swot.opportunitiesWeight * 10, barColor: CLR.blue },
      { label: "Threats", value: `${aiScores.swot.threatsWeight}/10`, barPct: aiScores.swot.threatsWeight * 10, barColor: CLR.orange },
    ],
    businessName, ownerName,
  });

  // ── SLIDE 6: HELP ME SOLVE THIS ──
  const slide6 = pptx.addSlide();
  slide6.background = { color: CLR.darkSlate };
  slide6.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: CLR.purple } });

  slide6.addText("HELP ME SOLVE THIS", {
    x: 0.8, y: 1.0, w: 8.4, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: CLR.purple, bold: true,
  });
  slide6.addText(slideContent.finalChallenge || "What strategic challenge should our team tackle together?", {
    x: 0.8, y: 1.8, w: 8.4, h: 1.4,
    fontSize: 24, fontFace: "Arial", color: CLR.white, bold: true,
  });
  slide6.addText(slideContent.finalContext || "", {
    x: 0.8, y: 3.5, w: 8.4, h: 0.6,
    fontSize: 13, fontFace: "Arial", color: CLR.slate400, italic: true,
  });
  slide6.addText(`${ownerName}  \u00B7  ${businessName}`, {
    x: 0.8, y: 4.4, w: 8.4, h: 0.3,
    fontSize: 11, fontFace: "Arial", color: CLR.slate500,
  });
  addFooter(slide6, pptx, businessName, ownerName);

  // ── Write to buffer ──
  const data = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return data;
}

// ════════════════════════════════════════
// Framework slide template
// ════════════════════════════════════════
interface FrameworkConfig {
  frameworkLabel: string;
  frameworkSub: string;
  accentColor: string;
  accentLight: string;
  headline: string;
  tension: string;
  question: string;
  scores: ScoreItem[];
  businessName: string;
  ownerName: string;
}

function buildFrameworkSlide(pptx: PptxGenJS, cfg: FrameworkConfig) {
  const slide = pptx.addSlide();
  slide.background = { color: CLR.white };

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: cfg.accentColor } });

  // Framework label
  slide.addText(cfg.frameworkLabel, {
    x: 0.6, y: 0.3, w: 5, h: 0.35,
    fontSize: 11, fontFace: "Arial", color: cfg.accentColor, bold: true,
  });
  slide.addText(cfg.frameworkSub, {
    x: 0.6, y: 0.6, w: 5, h: 0.25,
    fontSize: 10, fontFace: "Arial", color: CLR.slate400,
  });

  // ── LEFT: Score card ──
  const scoreStartY = 1.1;
  const scoreW = 4.0;
  const cardH = cfg.scores.length * 0.55 + 0.3;

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: scoreStartY - 0.1, w: scoreW, h: cardH,
    fill: { color: CLR.slate100 }, rectRadius: 0.1,
    line: { color: CLR.slate200, width: 0.5 },
  });

  cfg.scores.forEach((item, i) => {
    const itemY = scoreStartY + i * 0.55;

    slide.addText(item.label, {
      x: 0.7, y: itemY, w: 1.8, h: 0.25,
      fontSize: 10, fontFace: "Arial", color: CLR.slate700, bold: true,
    });
    slide.addText(item.value, {
      x: 2.5, y: itemY, w: 1.0, h: 0.25,
      fontSize: 10, fontFace: "Arial", color: item.barColor, bold: true, align: "right",
    });

    // Bar bg
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: itemY + 0.28, w: 3.5, h: 0.12,
      fill: { color: CLR.slate200 }, rectRadius: 0.06,
    });
    // Bar fill
    if (item.barPct > 0) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.7, y: itemY + 0.28, w: Math.max(0.12, 3.5 * (item.barPct / 100)), h: 0.12,
        fill: { color: item.barColor }, rectRadius: 0.06,
      });
    }
  });

  // ── RIGHT: Headline + Tension + Question ──
  const rightX = 5.0;
  const rightW = 4.6;

  // Headline
  slide.addText("\u2726", {
    x: rightX, y: 1.1, w: 0.3, h: 0.35,
    fontSize: 16, color: cfg.accentColor,
  });
  slide.addText(cfg.headline, {
    x: rightX + 0.3, y: 1.1, w: rightW - 0.3, h: 0.7,
    fontSize: 18, fontFace: "Arial", color: CLR.darkSlate, bold: true,
    valign: "top",
  });

  // Tension
  slide.addText("\u26A1 The uncomfortable truth:", {
    x: rightX, y: 2.2, w: rightW, h: 0.3,
    fontSize: 10, fontFace: "Arial", color: CLR.red, bold: true,
  });
  slide.addText(cfg.tension, {
    x: rightX, y: 2.55, w: rightW, h: 0.7,
    fontSize: 12, fontFace: "Arial", color: CLR.slate700,
    valign: "top",
  });

  // Question card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: rightX - 0.1, y: 3.5, w: rightW + 0.2, h: 0.9,
    fill: { color: cfg.accentLight }, rectRadius: 0.1,
  });
  slide.addText("\uD83D\uDCAC Question for my team:", {
    x: rightX, y: 3.55, w: rightW, h: 0.25,
    fontSize: 9, fontFace: "Arial", color: cfg.accentColor, bold: true,
  });
  slide.addText(cfg.question, {
    x: rightX, y: 3.8, w: rightW, h: 0.55,
    fontSize: 12, fontFace: "Arial", color: CLR.darkSlate, italic: true,
    valign: "top",
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
  sections.push(`### Competitive Pressure (Porter's 5 Forces)
- New Entrants: ${ff.newEntrants.severity}/10 (${ff.newEntrants.label})
- Suppliers: ${ff.suppliers.severity}/10 (${ff.suppliers.label})
- Rivalry: ${ff.rivalry.severity}/10 (${ff.rivalry.label})
- Buyers: ${ff.buyers.severity}/10 (${ff.buyers.label})
- Substitutes: ${ff.substitutes.severity}/10 (${ff.substitutes.label})
- Overall Industry Attractiveness: ${ff.overallAttractiveness}`);

  const vr = aiScores.vrio;
  sections.push(`### Resource Advantage (VRIO)
- Valuable (${vr.valuable.strength}/5): ${vr.valuable.insight}
- Rare (${vr.rare.strength}/5): ${vr.rare.insight}
- Inimitable (${vr.inimitable.strength}/5): ${vr.inimitable.insight}
- Organized (${vr.organized.strength}/5): ${vr.organized.insight}
- Competitive Advantage: ${vr.competitiveAdvantage}`);

  const sw = aiScores.swot;
  sections.push(`### Strategic Position (SWOT)
- Strengths: ${sw.strengthsWeight}/10
- Weaknesses: ${sw.weaknessesWeight}/10
- Opportunities: ${sw.opportunitiesWeight}/10
- Threats: ${sw.threatsWeight}/10`);

  sections.push(`### Overall
- Health Score: ${aiScores.healthScore}/100
- Narrative: ${aiScores.narrative}
- Business Name: ${analysis.businessName}
- Owner: ${analysis.ownerName}`);

  return sections.join("\n\n");
}
