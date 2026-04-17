import jsPDF from "jspdf";

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
  vrio: { competitiveAdvantage: string };
  fiveForces: { overallAttractiveness: string };
}

// ── Color palette ──
const COLORS = {
  darkSlate: [30, 41, 59],    // #1e293b
  slate700: [51, 65, 85],
  slate500: [100, 116, 139],
  slate400: [148, 163, 184],
  slate200: [226, 232, 240],
  white: [255, 255, 255],
  blue: [59, 130, 246],
  emerald: [16, 185, 129],
  amber: [245, 158, 11],
  red: [239, 68, 68],
  orange: [249, 115, 22],
  indigo: [99, 102, 241],
  purple: [139, 92, 246],
  blueBg: [239, 246, 255],
  emeraldBg: [236, 253, 245],
  amberBg: [255, 251, 235],
  redBg: [254, 242, 242],
  indigoBg: [238, 242, 255],
};

function getGradeColor(score: number): number[] {
  if (score >= 80) return COLORS.emerald;
  if (score >= 65) return COLORS.blue;
  if (score >= 50) return COLORS.amber;
  if (score >= 35) return COLORS.orange;
  return COLORS.red;
}

function getGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function generateReportPDF(
  report: ReportData,
  aiScores: AIScores,
  businessName: string,
  ownerName: string,
  ownerRegion: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Helper: Check page break ──
  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
      addPageFooter();
    }
  }

  // ── Helper: Add footer ──
  function addPageFooter() {
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slate400 as [number, number, number]);
    doc.text(`Strategy Coach — ${businessName} — Confidential`, margin, pageHeight - 8);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  // ── Helper: Draw text block with wrapping ──
  function drawWrappedText(text: string, x: number, maxWidth: number, fontSize: number, color: number[], lineHeight: number = 1.5): number {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color as [number, number, number]);
    const lines = doc.splitTextToSize(text, maxWidth);
    const totalHeight = lines.length * fontSize * 0.35 * lineHeight;
    checkPageBreak(totalHeight + 2);
    doc.text(lines, x, y);
    return lines.length * fontSize * 0.35 * lineHeight;
  }

  // ── Helper: Section header ──
  function drawSectionHeader(title: string, color: number[]) {
    checkPageBreak(14);
    // Accent bar
    doc.setFillColor(...color as [number, number, number]);
    doc.rect(margin, y - 1, 3, 8, "F");
    // Title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.darkSlate as [number, number, number]);
    doc.text(title, margin + 6, y + 5);
    y += 12;
  }

  // ── Helper: Sub-header ──
  function drawSubHeader(title: string, scoreText: string, scoreColor: number[]) {
    checkPageBreak(10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate700 as [number, number, number]);
    doc.text(title, margin + 2, y);
    
    // Score badge
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor as [number, number, number]);
    doc.text(scoreText, pageWidth - margin, y, { align: "right" });
    y += 5;
  }

  // ── Helper: Evidence + Rationale block ──
  function drawEvidenceBlock(evidence: string, rationale: string, improvement?: string) {
    // Evidence
    checkPageBreak(8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate500 as [number, number, number]);
    doc.text("EVIDENCE:", margin + 4, y);
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate700 as [number, number, number]);
    y += drawWrappedText(evidence, margin + 4, contentWidth - 8, 7.5, COLORS.slate700 as number[], 1.4);
    y += 1;

    // Rationale
    checkPageBreak(8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate500 as [number, number, number]);
    doc.text("RATIONALE:", margin + 4, y);
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    y += drawWrappedText(rationale, margin + 4, contentWidth - 8, 7.5, COLORS.slate700 as number[], 1.4);
    y += 1;

    // Improvement
    if (improvement) {
      checkPageBreak(8);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.indigo as [number, number, number]);
      doc.text("TO IMPROVE:", margin + 4, y);
      y += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      y += drawWrappedText(improvement, margin + 4, contentWidth - 8, 7.5, COLORS.indigo as number[], 1.4);
    }
    y += 3;
  }

  // ════════════════════════════════════════
  // PAGE 1: COVER
  // ════════════════════════════════════════

  // Dark header band
  doc.setFillColor(...COLORS.darkSlate as [number, number, number]);
  doc.rect(0, 0, pageWidth, 85, "F");

  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate400 as [number, number, number]);
  doc.text("STRATEGIC ASSESSMENT REPORT", margin, 25);

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white as [number, number, number]);
  doc.text(businessName, margin, 40);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.slate400 as [number, number, number]);
  doc.text(`${ownerName} · ${ownerRegion}`, margin, 50);

  // Grade circle
  const gradeColor = getGradeColor(aiScores.healthScore);
  const grade = getGrade(aiScores.healthScore);
  doc.setFillColor(...gradeColor as [number, number, number]);
  doc.circle(pageWidth - margin - 15, 40, 14, "F");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white as [number, number, number]);
  doc.text(grade, pageWidth - margin - 15, 45, { align: "center" });
  doc.setFontSize(9);
  doc.text(`${aiScores.healthScore}/100`, pageWidth - margin - 15, 52, { align: "center" });

  // Date
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate400 as [number, number, number]);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 70);
  doc.text("Powered by Strategy Coach AI", margin, 76);

  // Executive Summary
  y = 100;
  drawSectionHeader("Executive Summary", COLORS.indigo as number[]);
  doc.setFont("helvetica", "normal");
  y += drawWrappedText(report.executiveSummary, margin + 2, contentWidth - 4, 9.5, COLORS.slate700 as number[], 1.6);
  y += 6;

  // Overall Score Rationale
  checkPageBreak(20);
  doc.setFillColor(...(COLORS.indigoBg as [number, number, number]));
  const rationaleLines = doc.splitTextToSize(report.overallScoreRationale, contentWidth - 16);
  const rationaleHeight = rationaleLines.length * 4 + 10;
  doc.roundedRect(margin, y, contentWidth, rationaleHeight, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.indigo as [number, number, number]);
  doc.text(`OVERALL SCORE: ${aiScores.healthScore}/100 (${grade})`, margin + 6, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate700 as [number, number, number]);
  doc.text(rationaleLines, margin + 6, y + 12);
  y += rationaleHeight + 8;

  addPageFooter();

  // ════════════════════════════════════════
  // BUSINESS MODEL SECTION
  // ════════════════════════════════════════
  doc.addPage();
  y = margin;
  addPageFooter();

  drawSectionHeader(report.modules.businessModel.sectionTitle, COLORS.blue as number[]);
  doc.setFont("helvetica", "italic");
  y += drawWrappedText(report.modules.businessModel.overviewInsight, margin + 2, contentWidth - 4, 8.5, COLORS.slate500 as number[], 1.5);
  y += 4;

  for (const pillar of report.modules.businessModel.pillars) {
    drawSubHeader(pillar.name, `${pillar.score} / 5`, COLORS.amber as number[]);
    drawEvidenceBlock(pillar.evidence, pillar.rationale, pillar.improvement);
    y += 2;
  }

  // ════════════════════════════════════════
  // FIVE FORCES SECTION
  // ════════════════════════════════════════
  checkPageBreak(40);
  y += 4;
  drawSectionHeader(report.modules.fiveForces.sectionTitle, COLORS.red as number[]);
  doc.setFont("helvetica", "italic");
  y += drawWrappedText(report.modules.fiveForces.overviewInsight, margin + 2, contentWidth - 4, 8.5, COLORS.slate500 as number[], 1.5);
  y += 4;

  for (const force of report.modules.fiveForces.forces) {
    const severityColor = parseInt(force.severity) >= 7 ? COLORS.red : parseInt(force.severity) >= 4 ? COLORS.amber : COLORS.emerald;
    drawSubHeader(force.name, `${force.severity}/10 — ${force.label}`, severityColor as number[]);
    drawEvidenceBlock(force.evidence, force.rationale);
    y += 1;
  }

  // Attractiveness rationale
  checkPageBreak(15);
  doc.setFillColor(...(COLORS.redBg as [number, number, number]));
  const attrLines = doc.splitTextToSize(report.modules.fiveForces.attractivenessRationale, contentWidth - 16);
  const attrHeight = attrLines.length * 3.5 + 10;
  doc.roundedRect(margin, y, contentWidth, attrHeight, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.red as [number, number, number]);
  doc.text(`INDUSTRY ATTRACTIVENESS: ${aiScores.fiveForces.overallAttractiveness}`, margin + 6, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate700 as [number, number, number]);
  doc.text(attrLines, margin + 6, y + 12);
  y += attrHeight + 6;

  // ════════════════════════════════════════
  // VRIO SECTION
  // ════════════════════════════════════════
  checkPageBreak(40);
  y += 4;
  drawSectionHeader(report.modules.vrio.sectionTitle, COLORS.emerald as number[]);
  doc.setFont("helvetica", "italic");
  y += drawWrappedText(report.modules.vrio.overviewInsight, margin + 2, contentWidth - 4, 8.5, COLORS.slate500 as number[], 1.5);
  y += 4;

  for (const pillar of report.modules.vrio.pillars) {
    const vrioScore = parseInt(pillar.score);
    const pillarColor = vrioScore >= 4 ? COLORS.emerald : vrioScore >= 3 ? COLORS.amber : COLORS.red;
    drawSubHeader(pillar.name, `${pillar.score} / 5`, pillarColor as number[]);
    drawEvidenceBlock(pillar.evidence, pillar.rationale, pillar.improvement);
    y += 1;
  }

  // Competitive advantage rationale
  checkPageBreak(15);
  doc.setFillColor(...(COLORS.emeraldBg as [number, number, number]));
  const caLines = doc.splitTextToSize(report.modules.vrio.competitiveAdvantageRationale, contentWidth - 16);
  const caHeight = caLines.length * 3.5 + 10;
  doc.roundedRect(margin, y, contentWidth, caHeight, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.emerald as [number, number, number]);
  doc.text(`COMPETITIVE ADVANTAGE: ${aiScores.vrio.competitiveAdvantage}`, margin + 6, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slate700 as [number, number, number]);
  doc.text(caLines, margin + 6, y + 12);
  y += caHeight + 6;

  // ════════════════════════════════════════
  // SWOT SECTION
  // ════════════════════════════════════════
  checkPageBreak(40);
  y += 4;
  drawSectionHeader(report.modules.swot.sectionTitle, COLORS.amber as number[]);
  doc.setFont("helvetica", "italic");
  y += drawWrappedText(report.modules.swot.overviewInsight, margin + 2, contentWidth - 4, 8.5, COLORS.slate500 as number[], 1.5);
  y += 4;

  const swotColors: Record<string, number[]> = {
    Strengths: COLORS.emerald,
    Weaknesses: COLORS.red,
    Opportunities: COLORS.blue,
    Threats: COLORS.orange,
  };

  for (const quad of report.modules.swot.quadrants) {
    const qColor = swotColors[quad.name] || COLORS.slate500;
    drawSubHeader(quad.name, `${quad.weight} / 10`, qColor as number[]);
    drawEvidenceBlock(quad.evidence, quad.rationale);
    y += 1;
  }

  // ════════════════════════════════════════
  // STRATEGIC PRIORITIES
  // ════════════════════════════════════════
  checkPageBreak(35);
  y += 4;
  drawSectionHeader("Strategic Priorities", COLORS.purple as number[]);
  doc.setFont("helvetica", "italic");
  y += drawWrappedText(report.strategicPriorities.insight, margin + 2, contentWidth - 4, 8.5, COLORS.slate500 as number[], 1.5);
  y += 5;

  for (const p of report.strategicPriorities.priorities) {
    checkPageBreak(18);
    // Number circle
    const circleColor = p.rank === 1 ? COLORS.red : p.rank === 2 ? COLORS.amber : COLORS.emerald;
    doc.setFillColor(...circleColor as [number, number, number]);
    doc.circle(margin + 4, y - 1, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white as [number, number, number]);
    doc.text(`${p.rank}`, margin + 4, y + 0.5, { align: "center" });

    // Priority text
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.slate700 as [number, number, number]);
    doc.text(p.text, margin + 10, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    y += drawWrappedText(p.connectionToAnalysis, margin + 10, contentWidth - 14, 7.5, COLORS.slate500 as number[], 1.4);
    y += 4;
  }

  // ════════════════════════════════════════
  // TEAM IMPLICATIONS
  // ════════════════════════════════════════
  checkPageBreak(25);
  y += 4;
  drawSectionHeader("Team Implications", COLORS.indigo as number[]);
  doc.setFont("helvetica", "normal");
  y += drawWrappedText(report.teamImplications, margin + 2, contentWidth - 4, 8.5, COLORS.slate700 as number[], 1.6);

  // ── Add final page footer ──
  addPageFooter();

  // ── Save ──
  doc.save(`${businessName.replace(/\s+/g, "_")}_Strategic_Report.pdf`);
}
