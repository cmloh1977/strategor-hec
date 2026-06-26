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
  "valueCurve": {
    "differentiationScore": <1-10>,
    "insight": "<20 words max summarizing competitive positioning from the value curve>"
  },
  "narrative": "<2-3 sentence strategic narrative summarizing the business's strategic position, key strengths, and critical vulnerabilities>",
  "priorities": [
    { "urgency": "<high|medium|low>", "text": "<20 words max describing a strategic priority>" },
    { "urgency": "<high|medium|low>", "text": "<20 words max>" },
    { "urgency": "<high|medium|low>", "text": "<20 words max>" }
  ],
  "healthScore": <0-100>
}

## Scoring Philosophy — READ THIS CAREFULLY
You are scoring the QUALITY OF STRATEGIC THINKING, not the quality of writing or how impressive the business sounds.

A high-scoring analysis:
- Acknowledges **tensions and contradictions** (e.g., "Our key strength is also our biggest dependency")
- Identifies **specific, honest weaknesses** rather than vague or softened ones
- Shows **internal consistency** between modules (5 Forces threats should surface in SWOT threats; VRIO gaps should surface in weaknesses)
- Distinguishes between **genuinely rare capabilities** and industry table-stakes
- Names **concrete vulnerabilities** in the business model, not just strengths

A LOW-scoring analysis:
- Is uniformly positive across all dimensions (real businesses are messy — all-green is a red flag for lack of honesty)
- Uses corporate buzzwords without specific evidence
- Claims "Sustained Advantage" with generic resources that competitors clearly also have
- Lists only minor, harmless weaknesses while ignoring structural ones
- Has generic threats like "digital disruption" or "geopolitical instability" with no specific mechanism described

## Specific Scoring Guidance
- Business Model scores: 1=vague/missing, 2=shallow, 3=adequate, 4=strong with vulnerabilities acknowledged, 5=exceptional clarity AND honest about fragility points
- Five Forces severity: 1-3=Low (favorable), 4-6=Moderate, 7-8=High, 9-10=Very High (intense pressure). Score what the EVIDENCE suggests, not what sounds impressive.
- VRIO strength: 1=not demonstrated, 2=weak, 3=present, 4=strong with honest caveats, 5=exceptional AND the analysis explains WHY competitors cannot replicate it
- SWOT weights: Score based on STRATEGIC SIGNIFICANCE of the points, not count. A single critical, specific threat outweighs 3 generic ones. Reward brutally honest weaknesses — they show depth of reflection.
- Value Curve differentiation: 1-3=Undifferentiated (scores similar to competitors across most factors), 4-6=Moderately differentiated, 7-8=Clearly differentiated on key factors, 9-10=Highly unique positioning with clear blue ocean gaps. Score based on HOW DIFFERENT the scores are from competitors, not how high they are.
- Health Score: Holistically assess the overall QUALITY OF STRATEGIC THINKING (0-100). A thoughtful analysis that identifies real vulnerabilities should score HIGHER than a polished one that hides them. 50-65 is a genuinely good, honest analysis. 70+ requires both depth AND honesty. 80+ is exceptional strategic thinking with real tension acknowledged.
- Priorities: Focus on the 3 most impactful actions. Reward priorities that address honestly-identified weaknesses over vague aspirational goals.

Be rigorous and honest. Do not inflate scores. A typical mid-level manager's first analysis should score 40-65, not 80+.
CRITICAL: If all four VRIO dimensions score 4-5 AND all SWOT is positive, something is likely wrong — the analysis is probably too rosy. Adjust the health score downward and note this in the narrative.`;

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

═══ VALUE CURVE (Strategy Canvas) ═══
${analysis.valueCurve?.factors?.length ? analysis.valueCurve.factors.map((f: any) => `${f.name}: You=${f.myScore}${analysis.valueCurve.competitors?.map((c: string) => ` ${c}=${f.competitors?.[c] || '?'}`).join('')}`).join('\n') : '(not completed)'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
