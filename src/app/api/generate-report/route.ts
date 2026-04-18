import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({});

const REPORT_PROMPT = `You are a senior strategy consultant producing a formal **Strategic Assessment Report** for a business leader.

You will receive:
1. The leader's COMPLETE strategic analysis data (Business Model, Five Forces, VRIO, SWOT) — including the actual bullet points they wrote for each framework.
2. The AI-generated health card scores and insights for each dimension.

Your task: Write a detailed, professional **scoring rationale** that explains WHY each score was given, with specific references to the data points in their analysis. This is the "evidence trail" — connecting scores to conversations.

Return ONLY valid JSON (no markdown fences). Structure:

{
  "reportTitle": "<Business Name> — Strategic Assessment Report",
  "executiveSummary": "<3-4 sentence executive summary of the overall strategic position. Be direct and specific — reference actual data points, not generalities.>",
  "overallScoreRationale": "<2-3 sentences explaining why the overall health score is what it is. What drove it up? What dragged it down?>",
  "modules": {
    "businessModel": {
      "sectionTitle": "Business Model Assessment (Odyssey 3.14)",
      "overviewInsight": "<2 sentences summarizing the business model's overall health>",
      "pillars": [
        {
          "name": "Value Proposition",
          "score": "<the score/5>",
          "evidence": "<Which specific bullet points from the user's analysis support this score? Quote or paraphrase them.>",
          "rationale": "<2-3 sentences explaining WHY this pillar got this specific score. What was strong? What was the identified vulnerability or tension?>",
          "improvement": "<1 sentence: what would raise this score?>"
        },
        {
          "name": "Value Architecture",
          "score": "<the score/5>",
          "evidence": "<specific references>",
          "rationale": "<explanation>",
          "improvement": "<suggestion>"
        },
        {
          "name": "Contributions",
          "score": "<the score/5>",
          "evidence": "<specific references>",
          "rationale": "<explanation>",
          "improvement": "<suggestion>"
        }
      ]
    },
    "fiveForces": {
      "sectionTitle": "Competitive Pressure Assessment (Porter's 5 Forces)",
      "overviewInsight": "<2 sentences on the overall competitive landscape>",
      "forces": [
        {
          "name": "New Entrants",
          "severity": "<X/10>",
          "label": "<Low|Moderate|High|Very High>",
          "evidence": "<specific data from user's analysis>",
          "rationale": "<2-3 sentences on why this severity level>"
        },
        {
          "name": "Supplier Power",
          "severity": "<X/10>",
          "label": "<label>",
          "evidence": "<evidence>",
          "rationale": "<rationale>"
        },
        {
          "name": "Competitive Rivalry",
          "severity": "<X/10>",
          "label": "<label>",
          "evidence": "<evidence>",
          "rationale": "<rationale>"
        },
        {
          "name": "Buyer Power",
          "severity": "<X/10>",
          "label": "<label>",
          "evidence": "<evidence>",
          "rationale": "<rationale>"
        },
        {
          "name": "Substitutes",
          "severity": "<X/10>",
          "label": "<label>",
          "evidence": "<evidence>",
          "rationale": "<rationale>"
        }
      ],
      "attractivenessRationale": "<2 sentences on why the overall industry attractiveness rating was given>"
    },
    "vrio": {
      "sectionTitle": "Resource Advantage Assessment (VRIO Framework)",
      "overviewInsight": "<2 sentences on the competitive advantage position>",
      "pillars": [
        {
          "name": "Valuable",
          "score": "<X/5>",
          "evidence": "<specific VRIO data points>",
          "rationale": "<2-3 sentences>",
          "improvement": "<suggestion>"
        },
        {
          "name": "Rare",
          "score": "<X/5>",
          "evidence": "<evidence>",
          "rationale": "<rationale>",
          "improvement": "<suggestion>"
        },
        {
          "name": "Inimitable",
          "score": "<X/5>",
          "evidence": "<evidence>",
          "rationale": "<rationale>",
          "improvement": "<suggestion>"
        },
        {
          "name": "Organized",
          "score": "<X/5>",
          "evidence": "<evidence>",
          "rationale": "<rationale>",
          "improvement": "<suggestion>"
        }
      ],
      "competitiveAdvantageRationale": "<2 sentences explaining why the competitive advantage classification was chosen>"
    },
    "swot": {
      "sectionTitle": "Strategic Position Assessment (SWOT Synthesis)",
      "overviewInsight": "<2 sentences on the overall strategic balance>",
      "quadrants": [
        {
          "name": "Strengths",
          "weight": "<X/10>",
          "evidence": "<the actual strengths listed>",
          "rationale": "<why this weight — are they genuine differentiators or industry table-stakes?>"
        },
        {
          "name": "Weaknesses",
          "weight": "<X/10>",
          "evidence": "<the actual weaknesses listed>",
          "rationale": "<why this weight — are they structural or cosmetic?>"
        },
        {
          "name": "Opportunities",
          "weight": "<X/10>",
          "evidence": "<the actual opportunities listed>",
          "rationale": "<why this weight — are they actionable or aspirational?>"
        },
        {
          "name": "Threats",
          "weight": "<X/10>",
          "evidence": "<the actual threats listed>",
          "rationale": "<why this weight — are they specific and existential, or vague and generic?>"
        }
      ]
    }
  },
  "strategicPriorities": {
    "insight": "<1 sentence on how priorities connect to the analysis>",
    "priorities": [
      {
        "rank": 1,
        "text": "<the priority>",
        "connectionToAnalysis": "<1-2 sentences showing WHICH parts of the analysis this priority addresses>"
      },
      {
        "rank": 2,
        "text": "<the priority>",
        "connectionToAnalysis": "<connection>"
      },
      {
        "rank": 3,
        "text": "<the priority>",
        "connectionToAnalysis": "<connection>"
      }
    ]
  },
  "teamImplications": "<2-3 sentences on what this analysis means for the team exercise. What shared challenges or synergies might emerge? What questions should the team discuss?>"
}

CRITICAL INSTRUCTIONS:
- Be SPECIFIC. Reference actual bullet points from the analysis, not generalities.
- If the analysis acknowledged tensions or vulnerabilities, note that positively — it shows depth.
- If scores seem low, explain what honest insight drove them down. Low scores are NOT failures — they indicate honest reflection.
- The tone should be professional, direct, and respectful — like a McKinsey partner briefing a CEO.
- Keep each rationale to 2-3 sentences maximum. Dense and punchy, not verbose.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysis, aiScores } = body;

    if (!analysis || !aiScores) {
      return NextResponse.json({ error: "Missing analysis or aiScores" }, { status: 400 });
    }

    // Build comprehensive data summary for the AI
    const summarize = (points: string[]) => points?.length > 0 ? points.map(p => `  - ${p}`).join('\n') : '  (empty)';

    const analysisText = `
BUSINESS: ${analysis.businessName}
OWNER: ${analysis.ownerName} — ${analysis.ownerRegion}

═══ BUSINESS MODEL (Odyssey 3.14) ═══
Value Proposition:
${summarize(analysis.businessModel?.valueProposition?.points || [])}

Value Architecture:
${summarize(analysis.businessModel?.valueArchitecture?.points || [])}

Contributions:
${summarize(analysis.businessModel?.contributions?.points || [])}

═══ FIVE FORCES (Porter) ═══
New Entrants:
${summarize(analysis.fiveForces?.newEntrants?.points || [])}

Suppliers:
${summarize(analysis.fiveForces?.suppliers?.points || [])}

Rivalry:
${summarize(analysis.fiveForces?.rivalry?.points || [])}

Buyers:
${summarize(analysis.fiveForces?.buyers?.points || [])}

Substitutes:
${summarize(analysis.fiveForces?.substitutes?.points || [])}

═══ VRIO FRAMEWORK ═══
Valuable:
${summarize(analysis.vrio?.valuable?.points || [])}

Rare:
${summarize(analysis.vrio?.rare?.points || [])}

Inimitable:
${summarize(analysis.vrio?.inimitable?.points || [])}

Organized:
${summarize(analysis.vrio?.organized?.points || [])}

═══ SWOT SYNTHESIS ═══
Strengths:
${summarize(analysis.swot?.strengths?.points || [])}

Weaknesses:
${summarize(analysis.swot?.weaknesses?.points || [])}

Opportunities:
${summarize(analysis.swot?.opportunities?.points || [])}

Threats:
${summarize(analysis.swot?.threats?.points || [])}

═══ AI HEALTH CARD SCORES ═══
${JSON.stringify(aiScores, null, 2)}
`;
    // Attempt up to 2 tries — use responseMimeType to force valid JSON
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: analysisText }] }],
          config: {
            systemInstruction: REPORT_PROMPT,
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || "";
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const report = JSON.parse(cleaned);
        return NextResponse.json(report);
      } catch (parseErr: any) {
        console.error(`Report generation attempt ${attempt + 1} failed:`, parseErr.message);
        lastError = parseErr;
      }
    }

    return NextResponse.json(
      { error: lastError?.message || "Failed to generate report after retries" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
