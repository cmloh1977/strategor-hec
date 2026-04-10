import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({});

const ANALYSIS_PROMPT = `You are a senior strategy consultant performing a strategic health assessment. 
Analyze the following strategic framework data from a business analysis and return a structured JSON evaluation.

IMPORTANT: Return ONLY valid JSON, no markdown fences, no explanation text outside the JSON.

The JSON must follow this exact structure:
{
  "businessModel": {
    "valueProposition": { "score": <1-5>, "insight": "<15 words max>" },
    "valueArchitecture": { "score": <1-5>, "insight": "<15 words max>" },
    "contributions": { "score": <1-5>, "insight": "<15 words max>" }
  },
  "fiveForces": {
    "newEntrants": { "severity": <1-10>, "label": "<Low|Moderate|High|Very High>" },
    "suppliers": { "severity": <1-10>, "label": "<Low|Moderate|High|Very High>" },
    "rivalry": { "severity": <1-10>, "label": "<Low|Moderate|High|Very High>" },
    "buyers": { "severity": <1-10>, "label": "<Low|Moderate|High|Very High>" },
    "substitutes": { "severity": <1-10>, "label": "<Low|Moderate|High|Very High>" },
    "overallAttractiveness": "<Low|Moderate|High>"
  },
  "vrio": {
    "valuable": { "strength": <1-5>, "insight": "<12 words max>" },
    "rare": { "strength": <1-5>, "insight": "<12 words max>" },
    "inimitable": { "strength": <1-5>, "insight": "<12 words max>" },
    "organized": { "strength": <1-5>, "insight": "<12 words max>" },
    "competitiveAdvantage": "<Sustained|Temporary|Parity|Disadvantage>"
  },
  "swot": {
    "strengthsWeight": <1-10>,
    "weaknessesWeight": <1-10>,
    "opportunitiesWeight": <1-10>,
    "threatsWeight": <1-10>
  },
  "narrative": "<2-3 sentence strategic narrative summarizing the business's strategic position, key strengths, and critical vulnerabilities>",
  "priorities": [
    { "urgency": "<high|medium|low>", "text": "<20 words max describing a strategic priority>" },
    { "urgency": "<high|medium|low>", "text": "<20 words max>" },
    { "urgency": "<high|medium|low>", "text": "<20 words max>" }
  ],
  "healthScore": <0-100>
}

Scoring guidance:
- Business Model scores: 1=vague/missing, 2=shallow, 3=adequate, 4=strong, 5=exceptional clarity and specificity
- Five Forces severity: 1-3=Low (favorable), 4-6=Moderate, 7-8=High, 9-10=Very High (intense pressure)
- VRIO strength: 1=not demonstrated, 2=weak, 3=present, 4=strong, 5=exceptional
- SWOT weights: Score based on STRATEGIC SIGNIFICANCE of the points, not just count. A single critical threat can outweigh 3 minor strengths.
- Health Score: Holistically assess the overall strategic position (0-100)
- Priorities: Focus on the 3 most impactful actions the business should take

Be rigorous and honest. Do not inflate scores. A typical mid-level manager's first analysis should score 40-70, not 80+.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysis } = body;

    if (!analysis) {
      return NextResponse.json({ error: "Missing analysis data" }, { status: 400 });
    }

    // Build a text summary of all framework data
    const summarize = (points: string[]) => points.length > 0 ? points.join("\n- ") : "(empty)";

    const dataText = `
BUSINESS: ${analysis.businessName}
OWNER: ${analysis.ownerName} — ${analysis.ownerRegion}

═══ BUSINESS MODEL (Odyssey 3.14) ═══
Value Proposition:
- ${summarize(analysis.businessModel?.valueProposition?.points || [])}

Value Architecture:
- ${summarize(analysis.businessModel?.valueArchitecture?.points || [])}

Contributions:
- ${summarize(analysis.businessModel?.contributions?.points || [])}

═══ FIVE FORCES (Porter) ═══
New Entrants:
- ${summarize(analysis.fiveForces?.newEntrants?.points || [])}

Suppliers:
- ${summarize(analysis.fiveForces?.suppliers?.points || [])}

Rivalry:
- ${summarize(analysis.fiveForces?.rivalry?.points || [])}

Buyers:
- ${summarize(analysis.fiveForces?.buyers?.points || [])}

Substitutes:
- ${summarize(analysis.fiveForces?.substitutes?.points || [])}

═══ VRIO FRAMEWORK ═══
Valuable:
- ${summarize(analysis.vrio?.valuable?.points || [])}

Rare:
- ${summarize(analysis.vrio?.rare?.points || [])}

Inimitable:
- ${summarize(analysis.vrio?.inimitable?.points || [])}

Organized:
- ${summarize(analysis.vrio?.organized?.points || [])}

═══ SWOT SYNTHESIS ═══
Strengths:
- ${summarize(analysis.swot?.strengths?.points || [])}

Weaknesses:
- ${summarize(analysis.swot?.weaknesses?.points || [])}

Opportunities:
- ${summarize(analysis.swot?.opportunities?.points || [])}

Threats:
- ${summarize(analysis.swot?.threats?.points || [])}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: dataText }] }],
      config: {
        systemInstruction: ANALYSIS_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const raw = response.text || "";
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", cleaned);
      return NextResponse.json({ error: "Failed to parse AI analysis", raw: cleaned }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Analyze health error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
