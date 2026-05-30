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

    // ── Step 1: Call Gemini to translate/summarize findings into English ──
    const frameworkSummary = buildFrameworkSummary(analysis, aiScores);
    const slideContent = await generateSlideContent(frameworkSummary);

    // ── Step 2: Build the PPTX server-side ──
    const pptxBuffer = await buildPPTX(
      slideContent,
      aiScores,
      analysis,
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
// Gemini: Summarize findings in English
// ════════════════════════════════════════
async function generateSlideContent(frameworkSummary: string) {
  const prompt = `You are a senior strategy consultant helping a leadership program participant present their business analysis to their team.

The participant has completed a strategic analysis of their division. Your job is to create concise, clear ENGLISH presentation content that helps team members understand this business.

IMPORTANT: This is for SHARING FINDINGS, not for triggering Q&A. The goal is to help the audience understand the presenter's business, NOT to challenge them.

## Analysis Data
${frameworkSummary}

## Instructions
For each of the 4 frameworks, generate:
1. **headline**: A clear one-line insight that summarizes the key finding. NOT provocative — informative. Examples: "A strong HR model anchored in talent development and global networks", "High competitive pressure from industry consolidation". Maximum 15 words.
2. **keyFindings**: An array of 3 concise bullet points (in English) summarizing the most important findings from this framework. Each bullet should be 8-15 words. These are the talking points the presenter will elaborate on. DO NOT just repeat the raw data — synthesize and express the strategic meaning.
3. **synthesis**: A one-sentence synthesis of what this framework reveals about the business. This is the "so what?" takeaway.

Also generate:
4. **overallSynthesis**: A 2-sentence overall strategic narrative connecting all 4 frameworks together. What's the big picture?
5. **keyStrength**: The single most important strength discovered across all frameworks (one sentence).
6. **keyChallenge**: The single most important challenge or vulnerability discovered (one sentence).

## Required JSON Format (respond with ONLY valid JSON, no markdown fences):
{
  "businessModel": {
    "headline": "...",
    "keyFindings": ["...", "...", "..."],
    "synthesis": "..."
  },
  "fiveForces": {
    "headline": "...",
    "keyFindings": ["...", "...", "..."],
    "synthesis": "..."
  },
  "vrio": {
    "headline": "...",
    "keyFindings": ["...", "...", "..."],
    "synthesis": "..."
  },
  "swot": {
    "headline": "...",
    "keyFindings": ["...", "...", "..."],
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
// Build PPTX (server-side)
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

  // ══════════════════════════════
  // SLIDE 2: BUSINESS MODEL
  // ══════════════════════════════
  buildFrameworkSlide(pptx, {
    frameworkLabel: "BUSINESS MODEL",
    frameworkSub: "Odyssey 3.14",
    accentColor: CLR.blue,
    accentLight: CLR.blue50,
    headline: slideContent.businessModel?.headline || "Business Model Overview",
    keyFindings: slideContent.businessModel?.keyFindings || [],
    synthesis: slideContent.businessModel?.synthesis || "",
    scores: [
      { label: "Value Proposition", value: starsText(aiScores.businessModel.valueProposition.score), barPct: (aiScores.businessModel.valueProposition.score / 5) * 100, barColor: getBarColor(aiScores.businessModel.valueProposition.score, 5) },
      { label: "Value Architecture", value: starsText(aiScores.businessModel.valueArchitecture.score), barPct: (aiScores.businessModel.valueArchitecture.score / 5) * 100, barColor: getBarColor(aiScores.businessModel.valueArchitecture.score, 5) },
      { label: "Contributions", value: starsText(aiScores.businessModel.contributions.score), barPct: (aiScores.businessModel.contributions.score / 5) * 100, barColor: getBarColor(aiScores.businessModel.contributions.score, 5) },
    ],
    businessName, ownerName,
  });

  // ══════════════════════════════
  // SLIDE 3: FIVE FORCES
  // ══════════════════════════════
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
    headline: slideContent.fiveForces?.headline || "External Competitive Landscape",
    keyFindings: slideContent.fiveForces?.keyFindings || [],
    synthesis: slideContent.fiveForces?.synthesis || "",
    scores: forces.map(f => ({
      label: f.label,
      value: `${f.severity}/10`,
      barPct: (f.severity / 10) * 100,
      barColor: getThreatColor(f.severity),
    })),
    businessName, ownerName,
  });

  // ══════════════════════════════
  // SLIDE 4: VRIO
  // ══════════════════════════════
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
    headline: slideContent.vrio?.headline || "Internal Resource Analysis",
    keyFindings: slideContent.vrio?.keyFindings || [],
    synthesis: slideContent.vrio?.synthesis || "",
    scores: vrioItems.map(v => ({
      label: v.label,
      value: `${v.strength}/5`,
      barPct: (v.strength / 5) * 100,
      barColor: getBarColor(v.strength, 5),
    })),
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
    keyFindings: slideContent.swot?.keyFindings || [],
    synthesis: slideContent.swot?.synthesis || "",
    scores: [
      { label: "Strengths", value: `${aiScores.swot.strengthsWeight}/10`, barPct: aiScores.swot.strengthsWeight * 10, barColor: CLR.emerald },
      { label: "Weaknesses", value: `${aiScores.swot.weaknessesWeight}/10`, barPct: aiScores.swot.weaknessesWeight * 10, barColor: CLR.red },
      { label: "Opportunities", value: `${aiScores.swot.opportunitiesWeight}/10`, barPct: aiScores.swot.opportunitiesWeight * 10, barColor: CLR.blue },
      { label: "Threats", value: `${aiScores.swot.threatsWeight}/10`, barPct: aiScores.swot.threatsWeight * 10, barColor: CLR.orange },
    ],
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
    fontSize: 14, fontFace: "Arial", color: CLR.slate400,
    italic: true,
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
// Framework slide template (findings-focused)
// ════════════════════════════════════════
interface FrameworkConfig {
  frameworkLabel: string;
  frameworkSub: string;
  accentColor: string;
  accentLight: string;
  headline: string;
  keyFindings: string[];
  synthesis: string;
  scores: ScoreItem[];
  businessName: string;
  ownerName: string;
}

function buildFrameworkSlide(pptx: PptxGenJS, cfg: FrameworkConfig) {
  const slide = pptx.addSlide();
  slide.background = { color: CLR.white };

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: cfg.accentColor } });

  // Framework label + sub
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

  // ── RIGHT: Headline + Key Findings + Synthesis ──
  const rightX = 5.0;
  const rightW = 4.6;

  // Headline
  slide.addText("\u2726", {
    x: rightX, y: 1.05, w: 0.3, h: 0.35,
    fontSize: 16, color: cfg.accentColor,
  });
  slide.addText(cfg.headline, {
    x: rightX + 0.3, y: 1.05, w: rightW - 0.3, h: 0.6,
    fontSize: 16, fontFace: "Arial", color: CLR.darkSlate, bold: true,
    valign: "top",
  });

  // Key Findings header
  slide.addText("KEY FINDINGS", {
    x: rightX, y: 1.85, w: rightW, h: 0.25,
    fontSize: 9, fontFace: "Arial", color: cfg.accentColor, bold: true,
  });

  // Bullet points
  const findings = (cfg.keyFindings || []).slice(0, 3);
  findings.forEach((finding, i) => {
    const bulletY = 2.15 + i * 0.45;

    // Bullet dot
    slide.addShape(pptx.ShapeType.ellipse, {
      x: rightX + 0.05, y: bulletY + 0.07, w: 0.1, h: 0.1,
      fill: { color: cfg.accentColor },
    });

    // Bullet text
    slide.addText(finding, {
      x: rightX + 0.25, y: bulletY, w: rightW - 0.25, h: 0.4,
      fontSize: 12, fontFace: "Arial", color: CLR.slate700,
      valign: "top",
    });
  });

  // Synthesis card at bottom
  const synthY = 3.55;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: rightX - 0.1, y: synthY, w: rightW + 0.2, h: 0.85,
    fill: { color: cfg.accentLight }, rectRadius: 0.1,
  });
  slide.addText("SO WHAT?", {
    x: rightX, y: synthY + 0.05, w: rightW, h: 0.2,
    fontSize: 8, fontFace: "Arial", color: cfg.accentColor, bold: true,
  });
  slide.addText(cfg.synthesis, {
    x: rightX, y: synthY + 0.25, w: rightW, h: 0.55,
    fontSize: 11, fontFace: "Arial", color: CLR.darkSlate,
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
