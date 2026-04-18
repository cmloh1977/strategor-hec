// jsPDF is imported dynamically to avoid SSR issues

interface ReportData {
  reportTitle: string;
  executiveSummary: string;
  overallScoreRationale: string;
  modules: {
    businessModel: {
      sectionTitle: string;
      overviewInsight: string;
      pillars: { name: string; score: string; evidence: string; rationale: string; improvement: string }[];
    };
    fiveForces: {
      sectionTitle: string;
      overviewInsight: string;
      forces: { name: string; severity: string; label: string; evidence: string; rationale: string }[];
      attractivenessRationale: string;
    };
    vrio: {
      sectionTitle: string;
      overviewInsight: string;
      pillars: { name: string; score: string; evidence: string; rationale: string; improvement: string }[];
      competitiveAdvantageRationale: string;
    };
    swot: {
      sectionTitle: string;
      overviewInsight: string;
      quadrants: { name: string; weight: string; evidence: string; rationale: string }[];
    };
  };
  strategicPriorities: {
    insight: string;
    priorities: { rank: number; text: string; connectionToAnalysis: string }[];
  };
  teamImplications: string;
}

interface AIScores {
  healthScore: number;
  narrative: string;
  priorities: { urgency: string; text: string }[];
  businessModel: {
    valueProposition: { score: number; insight: string };
    valueArchitecture: { score: number; insight: string };
    contributions: { score: number; insight: string };
  };
  fiveForces: {
    newEntrants: { severity: number; label: string };
    suppliers: { severity: number; label: string };
    rivalry: { severity: number; label: string };
    buyers: { severity: number; label: string };
    substitutes: { severity: number; label: string };
    overallAttractiveness: string;
  };
  vrio: {
    valuable: { strength: number; insight: string };
    rare: { strength: number; insight: string };
    inimitable: { strength: number; insight: string };
    organized: { strength: number; insight: string };
    competitiveAdvantage: string;
  };
  swot: {
    strengthsWeight: number;
    weaknessesWeight: number;
    opportunitiesWeight: number;
    threatsWeight: number;
  };
}

interface PillarDataPDF {
  points: string[];
  populated: boolean;
}

export interface FrameworkData {
  businessModel: {
    valueProposition: PillarDataPDF;
    valueArchitecture: PillarDataPDF;
    contributions: PillarDataPDF;
  };
  fiveForces: {
    newEntrants: PillarDataPDF;
    suppliers: PillarDataPDF;
    rivalry: PillarDataPDF;
    buyers: PillarDataPDF;
    substitutes: PillarDataPDF;
  };
  vrio: {
    valuable: PillarDataPDF;
    rare: PillarDataPDF;
    inimitable: PillarDataPDF;
    organized: PillarDataPDF;
  };
  swot: {
    strengths: PillarDataPDF;
    weaknesses: PillarDataPDF;
    opportunities: PillarDataPDF;
    threats: PillarDataPDF;
  };
}

// ── Color palette ──
const C = {
  darkSlate: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate300: [203, 213, 225] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  blue50: [239, 246, 255] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emerald50: [236, 253, 245] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amber400: [251, 191, 36] as [number, number, number],
  amber50: [255, 251, 235] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  red50: [254, 242, 242] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  orange50: [255, 247, 237] as [number, number, number],
  indigo: [99, 102, 241] as [number, number, number],
  indigo50: [238, 242, 255] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
};

function getGradeColor(score: number): [number, number, number] {
  if (score >= 80) return C.emerald;
  if (score >= 65) return C.blue;
  if (score >= 50) return C.amber;
  if (score >= 35) return C.orange;
  return C.red;
}

function getGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

/** Parse score string "4/5" or "4" → number */
function parseScore(s: string | number): number {
  if (typeof s === "number") return s;
  const match = s.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

export async function generateReportPDF(
  report: ReportData,
  aiScores: AIScores,
  businessName: string,
  ownerName: string,
  ownerRegion: string,
  frameworkData?: FrameworkData
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;   // page width
  const H = 297;   // page height
  const M = 16;    // margin
  const CW = W - M * 2; // content width
  let y = 0;

  // ── Helpers ──
  function needsPage(needed: number) {
    if (y + needed > H - 18) {
      doc.addPage();
      y = M;
      footer();
    }
  }

  function footer() {
    doc.setFontSize(6.5);
    doc.setTextColor(...C.slate400);
    doc.text(`Strategy Coach — ${businessName} — Confidential`, M, H - 7);
    doc.text(`Page ${doc.getNumberOfPages()}`, W - M, H - 7, { align: "right" });
  }

  function wrap(text: string, x: number, maxW: number, fs: number, color: [number, number, number], lh = 1.5): number {
    doc.setFontSize(fs);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text || "", maxW);
    const h = lines.length * fs * 0.35 * lh;
    needsPage(h + 2);
    doc.text(lines, x, y);
    return h;
  }

  function sectionHead(title: string, accent: [number, number, number]) {
    needsPage(14);
    doc.setFillColor(...accent);
    doc.rect(M, y - 1, 3, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.darkSlate);
    doc.text(title, M + 6, y + 5);
    y += 12;
  }

  function subHead(title: string, scoreText: string, scoreColor: [number, number, number]) {
    needsPage(10);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate700);
    doc.text(title, M + 2, y);
    doc.setFontSize(9);
    doc.setTextColor(...scoreColor);
    doc.text(scoreText, W - M, y, { align: "right" });
    y += 5;
  }

  function evidenceBlock(evidence: string, rationale: string, improvement?: string) {
    needsPage(8);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate500);
    doc.text("EVIDENCE:", M + 4, y);
    y += 3;
    doc.setFont("helvetica", "normal");
    y += wrap(evidence, M + 4, CW - 8, 7.5, C.slate700, 1.4);
    y += 1.5;

    needsPage(8);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate500);
    doc.text("RATIONALE:", M + 4, y);
    y += 3;
    doc.setFont("helvetica", "normal");
    y += wrap(rationale, M + 4, CW - 8, 7.5, C.slate700, 1.4);
    y += 1.5;

    if (improvement) {
      needsPage(8);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.indigo);
      doc.text("TO IMPROVE:", M + 4, y);
      y += 3;
      doc.setFont("helvetica", "italic");
      y += wrap(improvement, M + 4, CW - 8, 7.5, C.indigo, 1.4);
    }
    y += 3;
  }

  // ════════════════════════════════════════
  // PAGE 1: HEADER + HEALTH CARD VISUALIZATION
  // ════════════════════════════════════════

  // ── Dark header band ──
  const headerH = 50;
  doc.setFillColor(...C.darkSlate);
  doc.rect(0, 0, W, headerH, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("STRATEGIC HEALTH CARD", M, 14);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text(businessName, M, 26);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text(`${ownerName} · ${ownerRegion}`, M, 34);

  // Grade badge
  const gradeColor = getGradeColor(aiScores.healthScore);
  const grade = getGrade(aiScores.healthScore);
  doc.setFillColor(...gradeColor);
  doc.circle(W - M - 12, 24, 12, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text(grade, W - M - 12, 28, { align: "center" });
  doc.setFontSize(8);
  doc.text(`${aiScores.healthScore}/100`, W - M - 12, 35, { align: "center" });

  // Date line
  doc.setFontSize(7);
  doc.setTextColor(...C.slate400);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, 44);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEALTH CARD — 4 Quadrant Grid
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  y = headerH + 4;
  const gridX = M;
  const gridW = CW;
  const halfW = gridW / 2 - 1;
  const leftX = gridX;
  const rightX = gridX + halfW + 2;

  // Outer card border
  doc.setDrawColor(...C.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(gridX, y, gridW, 0, 2, 2); // will be drawn over

  // ── Q1: Business Model (Top Left) ──
  const q1Y = y;
  doc.setFillColor(...C.white);
  doc.roundedRect(leftX, q1Y, halfW, 48, 2, 2, "FD");

  // Q1 header
  doc.setFillColor(...C.blue50);
  doc.roundedRect(leftX, q1Y, halfW, 8, 2, 2, "F");
  doc.rect(leftX, q1Y + 4, halfW, 4, "F"); // square off bottom corners
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.blue);
  doc.text("Business Model", leftX + 4, q1Y + 5.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("Odyssey 3.14", leftX + halfW - 4, q1Y + 5.5, { align: "right" });

  // Business Model stars
  const bmItems = [
    { label: "Value Proposition", score: aiScores.businessModel.valueProposition.score, insight: aiScores.businessModel.valueProposition.insight },
    { label: "Value Architecture", score: aiScores.businessModel.valueArchitecture.score, insight: aiScores.businessModel.valueArchitecture.insight },
    { label: "Contributions", score: aiScores.businessModel.contributions.score, insight: aiScores.businessModel.contributions.insight },
  ];

  let bmY = q1Y + 12;
  for (const item of bmItems) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate700);
    doc.text(item.label, leftX + 4, bmY);
    // Stars
    for (let i = 0; i < 5; i++) {
      doc.setFontSize(7);
      const starColor = i < item.score ? C.amber400 : C.slate200;
      doc.setTextColor(...starColor);
      doc.text("★", leftX + halfW - 20 + i * 4, bmY);
    }
    // Insight
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.slate400);
    const insightLines = doc.splitTextToSize(item.insight, halfW - 10);
    doc.text(insightLines[0] || "", leftX + 4, bmY + 3.5);
    bmY += 11;
  }

  // ── Q2: Competitive Pressure (Top Right) ──
  doc.setFillColor(...C.white);
  doc.roundedRect(rightX, q1Y, halfW, 48, 2, 2, "FD");

  // Q2 header
  doc.setFillColor(...C.red50);
  doc.roundedRect(rightX, q1Y, halfW, 8, 2, 2, "F");
  doc.rect(rightX, q1Y + 4, halfW, 4, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.red);
  doc.text("Competitive Pressure", rightX + 4, q1Y + 5.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("Porter's 5 Forces", rightX + halfW - 4, q1Y + 5.5, { align: "right" });

  // Force bars
  const forces = [
    { label: "New Entrants", severity: aiScores.fiveForces.newEntrants.severity },
    { label: "Suppliers", severity: aiScores.fiveForces.suppliers.severity },
    { label: "Rivalry", severity: aiScores.fiveForces.rivalry.severity },
    { label: "Buyers", severity: aiScores.fiveForces.buyers.severity },
    { label: "Substitutes", severity: aiScores.fiveForces.substitutes.severity },
  ];

  let fY = q1Y + 12;
  const barW = halfW - 40;
  for (const f of forces) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.slate600);
    doc.text(f.label, rightX + 4, fY);
    // Threat bar background
    const bx = rightX + 28;
    doc.setFillColor(...C.slate100);
    doc.roundedRect(bx, fY - 2.5, barW, 3, 1, 1, "F");
    // Filled portion
    const fillW = (f.severity / 10) * barW;
    const barColor: [number, number, number] = f.severity <= 3 ? C.emerald : f.severity <= 6 ? C.amber : f.severity <= 8 ? C.orange : C.red;
    doc.setFillColor(...barColor);
    doc.roundedRect(bx, fY - 2.5, fillW, 3, 1, 1, "F");
    // Label
    const label = f.severity <= 3 ? "Low" : f.severity <= 6 ? "Moderate" : f.severity <= 8 ? "High" : "Very High";
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...barColor);
    doc.text(label, rightX + halfW - 4, fY, { align: "right" });
    fY += 6.5;
  }

  // Attractiveness
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.slate500);
  doc.text("Industry Attractiveness: ", rightX + 4, fY);
  const attrColor: [number, number, number] = aiScores.fiveForces.overallAttractiveness === "High" ? C.emerald : aiScores.fiveForces.overallAttractiveness === "Moderate" ? C.amber : C.red;
  doc.setTextColor(...attrColor);
  doc.text(aiScores.fiveForces.overallAttractiveness, rightX + 31, fY);

  // ── Q3: VRIO (Bottom Left) ──
  const q3Y = q1Y + 51;
  doc.setFillColor(...C.white);
  doc.roundedRect(leftX, q3Y, halfW, 52, 2, 2, "FD");

  // Q3 header
  doc.setFillColor(...C.emerald50);
  doc.roundedRect(leftX, q3Y, halfW, 8, 2, 2, "F");
  doc.rect(leftX, q3Y + 4, halfW, 4, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.emerald);
  doc.text("Resource Advantage", leftX + 4, q3Y + 5.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("VRIO Framework", leftX + halfW - 4, q3Y + 5.5, { align: "right" });

  // VRIO bars
  const vrioItems = [
    { letter: "V", name: "Valuable", strength: aiScores.vrio.valuable.strength, insight: aiScores.vrio.valuable.insight },
    { letter: "R", name: "Rare", strength: aiScores.vrio.rare.strength, insight: aiScores.vrio.rare.insight },
    { letter: "I", name: "Inimitable", strength: aiScores.vrio.inimitable.strength, insight: aiScores.vrio.inimitable.insight },
    { letter: "O", name: "Organized", strength: aiScores.vrio.organized.strength, insight: aiScores.vrio.organized.insight },
  ];

  let vY = q3Y + 13;
  for (const v of vrioItems) {
    // Letter badge
    doc.setFillColor(...C.emerald50);
    doc.roundedRect(leftX + 4, vY - 3, 5, 5, 1, 1, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.emerald);
    doc.text(v.letter, leftX + 6.5, vY, { align: "center" });

    // Name + score
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate700);
    doc.text(v.name, leftX + 12, vY);
    doc.setTextColor(...C.slate500);
    doc.text(`${v.strength}/5`, leftX + halfW - 4, vY, { align: "right" });

    // Bar
    const bx = leftX + 12;
    const bw = halfW - 20;
    doc.setFillColor(...C.slate100);
    doc.roundedRect(bx, vY + 1, bw, 2, 0.5, 0.5, "F");
    const vBarColor: [number, number, number] = v.strength >= 4 ? C.emerald : v.strength >= 3 ? C.amber : C.orange;
    doc.setFillColor(...vBarColor);
    doc.roundedRect(bx, vY + 1, (v.strength / 5) * bw, 2, 0.5, 0.5, "F");

    // Insight
    doc.setFontSize(5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.slate400);
    const vInsight = doc.splitTextToSize(v.insight, halfW - 18);
    doc.text(vInsight[0] || "", leftX + 12, vY + 5.5);
    vY += 10;
  }

  // Competitive Advantage badge
  const caLabel = `${aiScores.vrio.competitiveAdvantage} Competitive Advantage`;
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.slate600);
  doc.text(caLabel, leftX + halfW / 2, vY, { align: "center" });

  // ── Q4: SWOT (Bottom Right) ──
  doc.setFillColor(...C.white);
  doc.roundedRect(rightX, q3Y, halfW, 52, 2, 2, "FD");

  // Q4 header
  doc.setFillColor(...C.amber50);
  doc.roundedRect(rightX, q3Y, halfW, 8, 2, 2, "F");
  doc.rect(rightX, q3Y + 4, halfW, 4, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.amber);
  doc.text("Strategic Position", rightX + 4, q3Y + 5.5);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("SWOT Synthesis", rightX + halfW - 4, q3Y + 5.5, { align: "right" });

  // Strategic Assets (Strengths & Opportunities)
  let sY = q3Y + 12;
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.emerald);
  doc.text("↗ Strategic Assets", rightX + 4, sY);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("(higher = stronger)", rightX + 28, sY);
  sY += 4;

  // Strengths block
  const blockW = (halfW - 10) / 2;
  doc.setFillColor(...C.emerald50);
  doc.roundedRect(rightX + 4, sY, blockW, 10, 1.5, 1.5, "F");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.emerald);
  doc.text("Strengths", rightX + 6, sY + 4);
  doc.text(`${aiScores.swot.strengthsWeight}/10`, rightX + 4 + blockW - 3, sY + 4, { align: "right" });
  doc.setFillColor(255, 255, 255, 150);
  doc.roundedRect(rightX + 6, sY + 6, blockW - 4, 1.5, 0.5, 0.5, "F");
  doc.setFillColor(...C.emerald);
  doc.roundedRect(rightX + 6, sY + 6, (aiScores.swot.strengthsWeight / 10) * (blockW - 4), 1.5, 0.5, 0.5, "F");

  // Opportunities block
  doc.setFillColor(...C.blue50);
  doc.roundedRect(rightX + 6 + blockW, sY, blockW, 10, 1.5, 1.5, "F");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.blue);
  doc.text("Opportunities", rightX + blockW + 8, sY + 4);
  doc.text(`${aiScores.swot.opportunitiesWeight}/10`, rightX + 6 + blockW * 2 - 3, sY + 4, { align: "right" });
  doc.setFillColor(255, 255, 255, 150);
  doc.roundedRect(rightX + blockW + 8, sY + 6, blockW - 4, 1.5, 0.5, 0.5, "F");
  doc.setFillColor(...C.blue);
  doc.roundedRect(rightX + blockW + 8, sY + 6, (aiScores.swot.opportunitiesWeight / 10) * (blockW - 4), 1.5, 0.5, 0.5, "F");

  sY += 14;

  // Strategic Risks
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.red);
  doc.text("⚠ Strategic Risks", rightX + 4, sY);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate400);
  doc.text("(higher = more critical)", rightX + 27, sY);
  sY += 4;

  // Weaknesses block
  doc.setFillColor(...C.red50);
  doc.roundedRect(rightX + 4, sY, blockW, 10, 1.5, 1.5, "F");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.red);
  doc.text("Weaknesses", rightX + 6, sY + 4);
  doc.text(`${aiScores.swot.weaknessesWeight}/10`, rightX + 4 + blockW - 3, sY + 4, { align: "right" });
  doc.setFillColor(255, 255, 255, 150);
  doc.roundedRect(rightX + 6, sY + 6, blockW - 4, 1.5, 0.5, 0.5, "F");
  doc.setFillColor(...C.red);
  doc.roundedRect(rightX + 6, sY + 6, (aiScores.swot.weaknessesWeight / 10) * (blockW - 4), 1.5, 0.5, 0.5, "F");

  // Threats block
  doc.setFillColor(...C.orange50);
  doc.roundedRect(rightX + 6 + blockW, sY, blockW, 10, 1.5, 1.5, "F");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.orange);
  doc.text("Threats", rightX + blockW + 8, sY + 4);
  doc.text(`${aiScores.swot.threatsWeight}/10`, rightX + 6 + blockW * 2 - 3, sY + 4, { align: "right" });
  doc.setFillColor(255, 255, 255, 150);
  doc.roundedRect(rightX + blockW + 8, sY + 6, blockW - 4, 1.5, 0.5, 0.5, "F");
  doc.setFillColor(...C.orange);
  doc.roundedRect(rightX + blockW + 8, sY + 6, (aiScores.swot.threatsWeight / 10) * (blockW - 4), 1.5, 0.5, 0.5, "F");

  sY += 14;

  // SWOT verdict
  const positiveW = aiScores.swot.strengthsWeight + aiScores.swot.opportunitiesWeight;
  const negativeW = aiScores.swot.weaknessesWeight + aiScores.swot.threatsWeight;
  const balance = positiveW - negativeW;
  let verdict: string;
  if (balance > 4) verdict = "Strong strategic position";
  else if (balance > 0) verdict = "Favorable with caution areas";
  else if (balance === 0) verdict = "Balanced — needs clear strategy";
  else if (balance > -4) verdict = "Vulnerable — act on strengths";
  else verdict = "High risk — defensive strategy needed";

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  const verdictColor: [number, number, number] = balance > 0 ? C.emerald : balance === 0 ? C.amber : C.red;
  doc.setTextColor(...verdictColor);
  const arrow = balance > 0 ? "↗" : balance === 0 ? "→" : "↘";
  doc.text(`${arrow} ${verdict}`, rightX + 4, sY);

  // ── AI Strategic Assessment (below grid) ──
  y = q3Y + 56;
  doc.setFillColor(...C.indigo50);
  const narrativeLines = doc.splitTextToSize(aiScores.narrative, CW - 16);
  const narrativeH = narrativeLines.length * 3.5 + 10;
  doc.roundedRect(M, y, CW, narrativeH, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.indigo);
  doc.text("✦ AI Strategic Assessment", M + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slate700);
  doc.text(narrativeLines, M + 5, y + 10);
  y += narrativeH + 4;

  // ── Strategic Priorities ──
  if (aiScores.priorities?.length) {
    needsPage(20);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate700);
    doc.text("Top Strategic Priorities", M + 2, y);
    y += 4;

    for (let i = 0; i < aiScores.priorities.length; i++) {
      const p = aiScores.priorities[i];
      const pColor: [number, number, number] = p.urgency === "high" ? C.red : p.urgency === "medium" ? C.amber : C.emerald;
      doc.setFillColor(...pColor);
      doc.circle(M + 5, y, 2, "F");
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      doc.text(`${i + 1}`, M + 5, y + 0.8, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.slate700);
      doc.text(p.text, M + 10, y + 0.5);
      y += 5;
    }
  }

  // ── Executive Summary ──
  y += 4;
  needsPage(20);
  sectionHead("Executive Summary", C.indigo);
  doc.setFont("helvetica", "normal");
  y += wrap(report.executiveSummary, M + 2, CW - 4, 8.5, C.slate700, 1.6);
  y += 4;

  // Overall score box
  needsPage(18);
  doc.setFillColor(...C.indigo50);
  const ratLines = doc.splitTextToSize(report.overallScoreRationale, CW - 16);
  const ratH = ratLines.length * 3.5 + 10;
  doc.roundedRect(M, y, CW, ratH, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.indigo);
  doc.text(`OVERALL SCORE: ${aiScores.healthScore}/100 (${grade})`, M + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slate700);
  doc.text(ratLines, M + 5, y + 10);
  y += ratH + 6;

  footer();

  // ════════════════════════════════════════
  // BUSINESS MODEL SECTION
  // ════════════════════════════════════════
  doc.addPage();
  y = M;
  footer();

  sectionHead(report.modules.businessModel.sectionTitle, C.blue);
  doc.setFont("helvetica", "italic");
  y += wrap(report.modules.businessModel.overviewInsight, M + 2, CW - 4, 8, C.slate500, 1.5);
  y += 4;

  for (const pillar of report.modules.businessModel.pillars) {
    const sc = parseScore(pillar.score);
    subHead(pillar.name, `${sc} / 5`, C.amber);
    evidenceBlock(pillar.evidence, pillar.rationale, pillar.improvement);
    y += 2;
  }

  // ════════════════════════════════════════
  // FIVE FORCES SECTION
  // ════════════════════════════════════════
  needsPage(40);
  y += 4;
  sectionHead(report.modules.fiveForces.sectionTitle, C.red);
  doc.setFont("helvetica", "italic");
  y += wrap(report.modules.fiveForces.overviewInsight, M + 2, CW - 4, 8, C.slate500, 1.5);
  y += 4;

  for (const force of report.modules.fiveForces.forces) {
    const sev = parseScore(force.severity);
    const severityColor: [number, number, number] = sev >= 7 ? C.red : sev >= 4 ? C.amber : C.emerald;
    subHead(force.name, `${sev}/10 — ${force.label}`, severityColor);
    evidenceBlock(force.evidence, force.rationale);
    y += 1;
  }

  // Attractiveness box
  needsPage(15);
  doc.setFillColor(...C.red50);
  const attrLines = doc.splitTextToSize(report.modules.fiveForces.attractivenessRationale, CW - 16);
  const attrH = attrLines.length * 3.5 + 10;
  doc.roundedRect(M, y, CW, attrH, 2, 2, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.red);
  doc.text(`INDUSTRY ATTRACTIVENESS: ${aiScores.fiveForces.overallAttractiveness}`, M + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.slate700);
  doc.text(attrLines, M + 5, y + 10);
  y += attrH + 6;

  // ════════════════════════════════════════
  // VRIO SECTION
  // ════════════════════════════════════════
  needsPage(40);
  y += 4;
  sectionHead(report.modules.vrio.sectionTitle, C.emerald);
  doc.setFont("helvetica", "italic");
  y += wrap(report.modules.vrio.overviewInsight, M + 2, CW - 4, 8, C.slate500, 1.5);
  y += 4;

  for (const pillar of report.modules.vrio.pillars) {
    const sc = parseScore(pillar.score);
    const pillarColor: [number, number, number] = sc >= 4 ? C.emerald : sc >= 3 ? C.amber : C.red;
    subHead(pillar.name, `${sc} / 5`, pillarColor);
    evidenceBlock(pillar.evidence, pillar.rationale, pillar.improvement);
    y += 1;
  }

  // Competitive advantage box
  needsPage(15);
  doc.setFillColor(...C.emerald50);
  const caLines = doc.splitTextToSize(report.modules.vrio.competitiveAdvantageRationale, CW - 16);
  const caH = caLines.length * 3.5 + 10;
  doc.roundedRect(M, y, CW, caH, 2, 2, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.emerald);
  doc.text(`COMPETITIVE ADVANTAGE: ${aiScores.vrio.competitiveAdvantage}`, M + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.slate700);
  doc.text(caLines, M + 5, y + 10);
  y += caH + 6;

  // ════════════════════════════════════════
  // SWOT SECTION
  // ════════════════════════════════════════
  needsPage(40);
  y += 4;
  sectionHead(report.modules.swot.sectionTitle, C.amber);
  doc.setFont("helvetica", "italic");
  y += wrap(report.modules.swot.overviewInsight, M + 2, CW - 4, 8, C.slate500, 1.5);
  y += 4;

  const swotColors: Record<string, [number, number, number]> = {
    Strengths: C.emerald,
    Weaknesses: C.red,
    Opportunities: C.blue,
    Threats: C.orange,
  };

  for (const quad of report.modules.swot.quadrants) {
    const qColor = swotColors[quad.name] || C.slate500;
    const qW = parseScore(quad.weight);
    subHead(quad.name, `${qW} / 10`, qColor);
    evidenceBlock(quad.evidence, quad.rationale);
    y += 1;
  }

  // ════════════════════════════════════════
  // STRATEGIC PRIORITIES (Detailed)
  // ════════════════════════════════════════
  needsPage(30);
  y += 4;
  sectionHead("Strategic Priorities", C.purple);
  doc.setFont("helvetica", "italic");
  y += wrap(report.strategicPriorities.insight, M + 2, CW - 4, 8, C.slate500, 1.5);
  y += 5;

  for (const p of report.strategicPriorities.priorities) {
    needsPage(16);
    const circleColor: [number, number, number] = p.rank === 1 ? C.red : p.rank === 2 ? C.amber : C.emerald;
    doc.setFillColor(...circleColor);
    doc.circle(M + 4, y - 0.5, 2.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text(`${p.rank}`, M + 4, y + 0.5, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.slate700);
    doc.text(p.text, M + 10, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    y += wrap(p.connectionToAnalysis, M + 10, CW - 14, 7, C.slate500, 1.4);
    y += 4;
  }

  // ════════════════════════════════════════
  // TEAM IMPLICATIONS
  // ════════════════════════════════════════
  needsPage(20);
  y += 4;
  sectionHead("Team Implications", C.indigo);
  doc.setFont("helvetica", "normal");
  y += wrap(report.teamImplications, M + 2, CW - 4, 8, C.slate700, 1.6);

  footer();

  // ════════════════════════════════════════
  // APPENDIX: Framework Diagrams
  // ════════════════════════════════════════
  if (frameworkData) {
    // Helper: draw a colored panel with title, icon text, and bullet points
    function drawPanel(
      px: number, py: number, pw: number, ph: number,
      bg: [number, number, number], title: string, subtitle: string,
      points: string[], populated: boolean
    ): number {
      // Panel background with rounded corners
      doc.setFillColor(...bg);
      doc.roundedRect(px, py, pw, ph, 3, 3, "F");

      // Title
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title, px + 5, py + 7);

      // Subtitle
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(255, 255, 255, 0.6);
      doc.text(subtitle, px + 5, py + 12);

      // Points
      let bulletY = py + 18;
      const items = populated ? points : [`(Not yet completed)`];
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      for (const item of items.slice(0, 8)) {
        if (bulletY > py + ph - 4) break;
        // Bullet dot
        doc.setFillColor(255, 255, 255);
        doc.circle(px + 6, bulletY - 0.8, 0.6, "F");
        // Text (wrap within panel)
        const lines = doc.splitTextToSize(item, pw - 14);
        for (const line of lines.slice(0, 2)) {
          if (bulletY > py + ph - 4) break;
          doc.text(line, px + 9, bulletY);
          bulletY += 3.2;
        }
        bulletY += 0.5;
      }
      return bulletY;
    }

    // ── Appendix A: Business Model (Odyssey 3.14) ──
    doc.addPage();
    y = M;
    footer();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.darkSlate);
    doc.text("Appendix A: Business Model", M, y + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.slate400);
    doc.text("Odyssey 3.14 — Lehmann-Ortega, Musikas, Schoettl", M, y + 11);
    y += 18;

    const bmPanelH = 75;
    const bmGap = 4;
    const bmHalfW = (CW - bmGap) / 2;
    // Value Proposition (left)
    drawPanel(M, y, bmHalfW, bmPanelH, [232, 99, 74], "Value Proposition", "Who? What?",
      frameworkData.businessModel.valueProposition.points, frameworkData.businessModel.valueProposition.populated);
    // Value Architecture (right)
    drawPanel(M + bmHalfW + bmGap, y, bmHalfW, bmPanelH, [30, 181, 196], "Value Architecture", "How?",
      frameworkData.businessModel.valueArchitecture.points, frameworkData.businessModel.valueArchitecture.populated);
    y += bmPanelH + bmGap;
    // Contributions (center)
    const contW = bmHalfW;
    drawPanel(M + (CW - contW) / 2, y, contW, bmPanelH, [137, 182, 48], "Contributions", "How much?",
      frameworkData.businessModel.contributions.points, frameworkData.businessModel.contributions.populated);

    // ── Appendix B: Five Forces (Porter) ──
    doc.addPage();
    y = M;
    footer();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.darkSlate);
    doc.text("Appendix B: External Analysis — Five Forces", M, y + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.slate400);
    doc.text("Porter's Five Forces — Michael E. Porter", M, y + 11);
    y += 18;

    const ffPanelW = (CW - bmGap * 2) / 3;
    const ffPanelH = 65;
    const ffSlate: [number, number, number] = [100, 116, 139];
    const ffIndigo: [number, number, number] = [79, 70, 229];

    // Row 1: New Entrants (center)
    drawPanel(M + ffPanelW + bmGap, y, ffPanelW, ffPanelH, ffSlate, "New Entrants", "Threat",
      frameworkData.fiveForces.newEntrants.points, frameworkData.fiveForces.newEntrants.populated);
    y += ffPanelH + bmGap;

    // Row 2: Suppliers (left), Rivalry (center), Buyers (right)
    drawPanel(M, y, ffPanelW, ffPanelH, ffSlate, "Suppliers", "Bargaining Power",
      frameworkData.fiveForces.suppliers.points, frameworkData.fiveForces.suppliers.populated);
    drawPanel(M + ffPanelW + bmGap, y, ffPanelW, ffPanelH, ffIndigo, "Industry Rivalry", "Competition Intensity",
      frameworkData.fiveForces.rivalry.points, frameworkData.fiveForces.rivalry.populated);
    drawPanel(M + (ffPanelW + bmGap) * 2, y, ffPanelW, ffPanelH, ffSlate, "Buyers", "Bargaining Power",
      frameworkData.fiveForces.buyers.points, frameworkData.fiveForces.buyers.populated);
    y += ffPanelH + bmGap;

    // Row 3: Substitutes (center)
    drawPanel(M + ffPanelW + bmGap, y, ffPanelW, ffPanelH, ffSlate, "Substitutes", "Threat",
      frameworkData.fiveForces.substitutes.points, frameworkData.fiveForces.substitutes.populated);

    // ── Appendix C: VRIO Analysis ──
    doc.addPage();
    y = M;
    footer();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.darkSlate);
    doc.text("Appendix C: Internal Analysis — VRIO", M, y + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.slate400);
    doc.text("VRIO Framework — Jay B. Barney", M, y + 11);
    y += 18;

    const vrioW = (CW - bmGap) / 2;
    const vrioH = 90;
    // Row 1: Valuable + Rare
    drawPanel(M, y, vrioW, vrioH, [16, 185, 129], "Valuable", "Does it provide value?",
      frameworkData.vrio.valuable.points, frameworkData.vrio.valuable.populated);
    drawPanel(M + vrioW + bmGap, y, vrioW, vrioH, [245, 158, 11], "Rare", "Do few others have it?",
      frameworkData.vrio.rare.points, frameworkData.vrio.rare.populated);
    y += vrioH + bmGap;
    // Row 2: Inimitable + Organized
    drawPanel(M, y, vrioW, vrioH, [239, 68, 68], "Inimitable", "Is it costly to copy?",
      frameworkData.vrio.inimitable.points, frameworkData.vrio.inimitable.populated);
    drawPanel(M + vrioW + bmGap, y, vrioW, vrioH, [99, 102, 241], "Organized", "Is the firm organized to exploit it?",
      frameworkData.vrio.organized.points, frameworkData.vrio.organized.populated);

    // ── Appendix D: SWOT Synthesis ──
    doc.addPage();
    y = M;
    footer();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.darkSlate);
    doc.text("Appendix D: SWOT Synthesis", M, y + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.slate400);
    doc.text("SWOT Analysis — Albert Humphrey", M, y + 11);
    y += 18;

    const swotW = (CW - bmGap) / 2;
    const swotH = 90;
    // Row 1: Strengths + Weaknesses
    drawPanel(M, y, swotW, swotH, [13, 148, 136], "Strengths", "Internal Positive",
      frameworkData.swot.strengths.points, frameworkData.swot.strengths.populated);
    drawPanel(M + swotW + bmGap, y, swotW, swotH, [190, 18, 60], "Weaknesses", "Internal Negative",
      frameworkData.swot.weaknesses.points, frameworkData.swot.weaknesses.populated);
    y += swotH + bmGap;
    // Row 2: Opportunities + Threats
    drawPanel(M, y, swotW, swotH, [2, 132, 199], "Opportunities", "External Positive",
      frameworkData.swot.opportunities.points, frameworkData.swot.opportunities.populated);
    drawPanel(M + swotW + bmGap, y, swotW, swotH, [180, 83, 9], "Threats", "External Negative",
      frameworkData.swot.threats.points, frameworkData.swot.threats.populated);
  }

  // ── Save ──
  doc.save(`${businessName.replace(/\s+/g, "_")}_Strategic_Report.pdf`);
}
