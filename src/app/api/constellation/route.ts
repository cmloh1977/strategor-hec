import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const ai = new GoogleGenAI({});

// ── Level 2: Pattern Recognition Prompt (HEC / Strategor) ──
const PATTERN_PROMPT = `You are a senior strategy consultant coaching a team of business leaders.
Each team member has completed a strategic analysis of their own business or division using the Strategor framework:
- Business Model (Odyssey 3.14)
- Porter's Five Forces
- VRIO Framework
- SWOT Synthesis

You have access to each team member's complete strategic analysis data AND their coaching conversation history.

Your task: Identify cross-divisional PATTERNS — shared challenges, common strengths, synergy opportunities, and organizational themes.

Return ONLY valid JSON (no markdown fences). Structure:

{
  "commonThreats": [
    { "theme": "<short title>", "description": "<2 sentences>", "affectedDivisions": ["<division names>"], "severity": "<high|medium|low>" }
  ],
  "commonStrengths": [
    { "theme": "<short title>", "description": "<2 sentences>", "divisions": ["<divisions>"] }
  ],
  "synergies": [
    { "title": "<opportunity name>", "description": "<2 sentences explaining how divisions could collaborate>", "divisions": ["<divisions>"] }
  ],
  "vrioGaps": [
    { "dimension": "<V|R|I|O>", "observation": "<what the team-wide pattern shows>", "divisions": ["<divisions affected>"] }
  ],
  "forcesHeatmap": {
    "<division1>": { "newEntrants": <1-10>, "suppliers": <1-10>, "rivalry": <1-10>, "buyers": <1-10>, "substitutes": <1-10> },
    "<division2>": { ... }
  },
  "industryInsight": "<2-3 sentence summary of what the combined 5 Forces picture tells us about the competitive landscape across these businesses>",
  "teamNarrative": "<3-4 sentence strategic narrative about the team's collective strategic position, key patterns, and biggest shared opportunity>"
}

Be rigorous. Look for REAL patterns, not forced connections. If only 1 out of 5 divisions shares a trait, that's not a pattern.`;

// ── Level 3: McKinsey/GE Matrix Synthesis Prompt (HEC / Strategor) ──
const DIMENSION_PROMPT = `You are a senior strategy consultant coaching a team through corporate-level strategic synthesis using the McKinsey/GE Matrix (also known as the GE-McKinsey Nine-Cell Matrix), as taught in the Strategor framework (Chapter 7).

The McKinsey Matrix evaluates each business on TWO axes:

INDUSTRY ATTRACTIVENESS (derived from their 5 Forces analysis + external environment):
- Market size and growth rate
- Competitive intensity (from Porter's 5 Forces)
- Technological change and disruption risk
- Regulatory environment
- Profitability potential
Rate each division: HIGH / MEDIUM / LOW

COMPETITIVE STRENGTH (derived from their VRIO analysis + Business Model):
- Market share and brand strength
- Resource uniqueness (VRIO dimensions met)
- Business model differentiation
- Cost position and operational capabilities
- Innovation and adaptability
Rate each division: HIGH / MEDIUM / LOW

The 9-cell matrix produces strategic prescriptions:
┌────────────────────┬─────────────────────┬─────────────────────┐
│ HIGH Attract.      │ MEDIUM Attract.     │ LOW Attract.        │
├────────────────────┼─────────────────────┼─────────────────────┤
│ STRONG: Protect    │ STRONG: Maintain &  │ STRONG: Harvest     │
│ position, invest   │ grow selectively    │ for profitability   │
├────────────────────┼─────────────────────┼─────────────────────┤
│ MEDIUM: Invest to  │ MEDIUM: Manage      │ MEDIUM: Withdraw    │
│ improve position   │ selectively         │ selectively         │
├────────────────────┼─────────────────────┼─────────────────────┤
│ WEAK: Double down  │ WEAK: Divest        │ WEAK: Divest or     │
│ or give up         │ selectively         │ liquidate           │
└────────────────────┴─────────────────────┴─────────────────────┘

Given the team's cross-divisional patterns and individual analyses, plot each division on the McKinsey Matrix and suggest a strategic portfolio action plan.

Return ONLY valid JSON:

{
  "dimensionMapping": [
    {
      "pattern": "<the cross-divisional pattern>",
      "dimensions": ["<attractiveness level>", "<competitive strength level>"],
      "valueDomain": "<strategic prescription from matrix>",
      "rationale": "<2 sentences on why this maps here>"
    }
  ],
  "matrixPlacement": [
    {
      "division": "<division name>",
      "industryAttractiveness": "<HIGH|MEDIUM|LOW>",
      "competitiveStrength": "<HIGH|MEDIUM|LOW>",
      "attractivenessFactors": "<key factors driving the rating>",
      "strengthFactors": "<key factors driving the rating>",
      "prescription": "<strategic prescription from the matrix cell>"
    }
  ],
  "suggestedProject": {
    "title": "<compelling project title>",
    "dimensions": ["<which matrix cells are targeted>"],
    "valueDomain": "<portfolio-level strategic theme>",
    "challenge": "<the shared challenge this addresses>",
    "hypothesis": "<If we do X, we can achieve Y>",
    "higherDimensionLeap": "<how this goes beyond optimization to create cross-divisional synergies>",
    "divisionsInvolved": ["<list>"],
    "keyMetrics": ["<market share target>", "<profitability KPIs>", "<other measurables>"],
    "first90Days": ["<action 1>", "<action 2>", "<action 3>"]
  },
  "coachingQuestions": [
    "<provocative question to push the team's thinking further>"
  ]
}`;


// ── Helper: Build analysis text for one member ──
function formatMemberAnalysis(card: any, chatHistory?: any): string {
  const summarize = (points: string[]) => points?.length > 0 ? points.map(p => `  - ${p}`).join('\n') : '  (empty)';
  
  let text = `
══════════════════════════════════════════
DIVISION: ${card.businessName}
OWNER: ${card.ownerName} — ${card.ownerRegion}
══════════════════════════════════════════

── BUSINESS MODEL (Odyssey 3.14) ──
Value Proposition:
${summarize(card.businessModel?.valueProposition?.points || [])}

Value Architecture:
${summarize(card.businessModel?.valueArchitecture?.points || [])}

Contributions:
${summarize(card.businessModel?.contributions?.points || [])}

── FIVE FORCES (Porter) ──
New Entrants:
${summarize(card.fiveForces?.newEntrants?.points || [])}

Suppliers:
${summarize(card.fiveForces?.suppliers?.points || [])}

Rivalry:
${summarize(card.fiveForces?.rivalry?.points || [])}

Buyers:
${summarize(card.fiveForces?.buyers?.points || [])}

Substitutes:
${summarize(card.fiveForces?.substitutes?.points || [])}

── VRIO FRAMEWORK ──
Valuable:
${summarize(card.vrio?.valuable?.points || [])}

Rare:
${summarize(card.vrio?.rare?.points || [])}

Inimitable:
${summarize(card.vrio?.inimitable?.points || [])}

Organized:
${summarize(card.vrio?.organized?.points || [])}

── SWOT SYNTHESIS ──
Strengths:
${summarize(card.swot?.strengths?.points || [])}

Weaknesses:
${summarize(card.swot?.weaknesses?.points || [])}

Opportunities:
${summarize(card.swot?.opportunities?.points || [])}

Threats:
${summarize(card.swot?.threats?.points || [])}
`;

  // Append chat history summaries if available
  if (chatHistory) {
    const modules = ['business-model', 'external-analysis', 'internal-analysis', 'swot-synthesis'];
    for (const mod of modules) {
      if (chatHistory[mod]?.messages?.length > 0) {
        text += `\n── COACHING CONVERSATION: ${mod} ──\n`;
        // Include key user messages (not system) to capture their reasoning
        const msgs = chatHistory[mod].messages
          .filter((m: any) => m.role === 'user' || m.role === 'model')
          .slice(-10); // last 10 messages per module
        for (const m of msgs) {
          const role = m.role === 'user' ? 'PARTICIPANT' : 'COACH';
          text += `[${role}]: ${m.parts?.[0]?.text?.substring(0, 500) || ''}\n`;
        }
      }
    }
  }

  return text;
}

// ── Fetch chat history for a member via admin SDK ──
async function fetchChatHistory(uid: string): Promise<Record<string, any>> {
  const chatHistory: Record<string, any> = {};
  const modules = ['business-model', 'external-analysis', 'internal-analysis', 'swot-synthesis'];
  
  for (const mod of modules) {
    try {
      const snap = await adminDb.collection('users').doc(uid).collection('chats').doc(mod).get();
      if (snap.exists) {
        chatHistory[mod] = snap.data();
      }
    } catch (e) {
      console.error(`Failed to fetch chat for ${uid}/${mod}:`, e);
    }
  }
  
  return chatHistory;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cards, action } = body; // cards = HealthCard[], action = 'patterns' | 'dimensions' | 'chat'

    if (!cards || !Array.isArray(cards) || cards.length < 2) {
      return NextResponse.json({ error: "Need at least 2 team cards" }, { status: 400 });
    }

    // Fetch chat history for all members (via admin SDK)
    const chatHistories: Record<string, any> = {};
    for (const card of cards) {
      if (card.ownerUID) {
        chatHistories[card.ownerUID] = await fetchChatHistory(card.ownerUID);
      }
    }

    // Build combined analysis text
    const allMembersText = cards.map((card: any) => 
      formatMemberAnalysis(card, chatHistories[card.ownerUID] || null)
    ).join('\n\n');

    const teamSummary = `TEAM ANALYSIS — ${cards.length} divisions\nMembers: ${cards.map((c: any) => `${c.ownerName} (${c.businessName})`).join(', ')}\n\n${allMembersText}`;

    let systemPrompt: string;
    if (action === 'dimensions') {
      systemPrompt = DIMENSION_PROMPT;
    } else {
      systemPrompt = PATTERN_PROMPT;
    }

    // ── V8: Member Challenge (per-member AI commentary) ──
    if (action === 'member-challenge') {
      const { targetCard, selfPosition, aiPosition, humanChallenges, previousAICommentary } = body;
      if (!targetCard) {
        return NextResponse.json({ error: "Missing target card" }, { status: 400 });
      }

      const targetAnalysis = formatMemberAnalysis(targetCard);
      const selfQ = selfPosition ? `Competitive Strength ${selfPosition.x.toFixed(0)}%, Market Dynamism ${selfPosition.y.toFixed(0)}%` : "Not placed";
      const aiQ = aiPosition ? `Competitive Strength ${aiPosition.x.toFixed(0)}%, Market Dynamism ${aiPosition.y.toFixed(0)}%` : "Not computed";
      
      const challengeSummary = humanChallenges?.length > 0
        ? humanChallenges.map((c: any) => `[${c.authorName}]: ${c.text}`).join('\n')
        : "(No team challenges yet)";

      const prevAI = previousAICommentary?.length > 0
        ? previousAICommentary.map((p: any) => `[${p.name} — ${p.business}]: ${p.challenges?.map((c: any) => c.text).join(' ')}`).join('\n\n')
        : "(This is the first member being challenged)";

      const memberChallengePrompt = `You are a senior strategy consultant facilitating a strategic portfolio mapping exercise.

A team is mapping their businesses on a 2×2 Strategic Portfolio Grid:
- X-axis: Competitive Strength (VRIO + Business Model) — 0% (Weak) to 100% (Strong)
- Y-axis: Market Dynamism (5 Forces intensity) — 0% (Stable) to 100% (Intense/High Change)

The member "${targetCard.ownerName}" (${targetCard.businessName}) placed themselves at: ${selfQ}

Their analysis data:
${targetAnalysis}

Their teammates asked these challenge questions:
${challengeSummary}

## YOUR TASK

You are NOT writing an analysis. You are asking questions that make the member THINK DEEPER.

1. **Briefly acknowledge** 1-2 of the most insightful team questions (1 sentence each, naming the questioner). If none are particularly relevant, skip this.

2. **Ask exactly 3 powerful strategic questions** that:
   - Reference SPECIFIC data from their analysis (cite actual numbers, frameworks, or gaps)
   - Go deeper than what the team already asked
   - Force the member to reconsider their positioning
   - Each question should challenge a different dimension (e.g., competitive strength, market dynamics, sustainability)

## FORMAT

Keep it short and punchy. No headers, no bullet analysis, no conclusions.
Use this exact format:

[If acknowledging team questions]
"@[Name]'s question about [topic] is sharp — [brief reason]."

**Then the 3 questions, each on its own line, numbered:**

1. [Question referencing specific data]
2. [Question referencing specific data]  
3. [Question referencing specific data]

Total response: 100-180 words maximum. Questions only, no answers.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: `Challenge this member's strategic positioning:\n\n${targetAnalysis}` }] }],
        config: {
          systemInstruction: memberChallengePrompt,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      return NextResponse.json({ text: response.text || "" });
    }

    // ── V8: Portfolio Synthesis (collective view after all rounds) ──
    if (action === 'portfolio-synthesis') {
      const { placements } = body;

      const placementSummary = placements?.map((p: any) => {
        const selfQ = p.selfPosition ? `(${p.selfPosition.x.toFixed(0)}%, ${p.selfPosition.y.toFixed(0)}%)` : "Not placed";
        const aiQ = p.aiPosition ? `(${p.aiPosition.x.toFixed(0)}%, ${p.aiPosition.y.toFixed(0)}%)` : "N/A";
        const adjQ = p.adjustedPosition ? `(${p.adjustedPosition.x.toFixed(0)}%, ${p.adjustedPosition.y.toFixed(0)}%)` : "No adjustment";
        const challenges = p.challenges?.map((c: any) => `  [${c.type}] ${c.authorName}: ${c.text.substring(0, 200)}`).join('\n') || "  (none)";
        return `${p.ownerName} / ${p.businessName}:\n  Self: ${selfQ} | AI: ${aiQ} | Adjusted: ${adjQ}\n  Challenges:\n${challenges}`;
      }).join('\n\n') || "(No placements)";

      const portfolioPrompt = `You are a senior strategy consultant synthesizing a team's collaborative Strategic Portfolio Mapping exercise.

The team mapped their businesses on a 2×2 grid (Competitive Strength × Market Dynamism). Each member placed themselves, was challenged by teammates and AI, and optionally adjusted their position.

Here is the complete data:

ALL TEAM MEMBERS' ANALYSES:
${teamSummary}

PLACEMENT RESULTS:
${placementSummary}

## YOUR TASK

Generate a portfolio-level synthesis that:

1. **Summarize the self-assessment vs. data gap pattern** — Did most members overestimate or underestimate? What does this say about the team's strategic awareness?
2. **Identify shared vulnerabilities** surfaced through challenges — What concerns came up repeatedly across members?
3. **Analyze portfolio balance** — Is the team clustered in one quadrant? Are there missing quadrants? What does this mean strategically?
4. **Bridge to Level 2** — Based on this mapping, what cross-team patterns should the team explore next? What potential synergies or shared projects emerge?
5. **Ask 3 provocative portfolio-level questions** that the team should discuss together.

Format in markdown with ### headers. Be specific — reference member names and their businesses. Keep it to 400-600 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: `Synthesize this team's strategic portfolio mapping:\n\n${placementSummary}` }] }],
        config: {
          systemInstruction: portfolioPrompt,
          temperature: 0.7,
          maxOutputTokens: 3072,
        },
      });

      return NextResponse.json({ text: response.text || "" });
    }

    // For chat action, use a custom prompt with history context
    if (action === 'chat') {
      const { message, chatHistory: convoHistory } = body;
      
      const constellationChatPrompt = `You are the TEAM Thinking Partner for a strategy team.
You have access to ALL team members' individual analyses AND their coaching conversations.
You're now facilitating a GROUP discussion to identify cross-divisional patterns, apply the McKinsey/GE Matrix, and build toward a strategic action plan.

The Strategor Framework Context:
- Each member analyzed their business using: Business Model (Odyssey 3.14), Porter's 5 Forces, VRIO, and SWOT
- At Level 3, the team maps their businesses onto the McKinsey/GE Matrix:
  • Y-axis: Industry Attractiveness (from 5 Forces — competitive intensity, growth, disruption risk)
  • X-axis: Competitive Strength (from VRIO + Business Model — unique resources, differentiation, positioning)
  • Each cell prescribes a strategic action: Protect, Invest, Maintain, Harvest, Withdraw, Divest

Your role:
- Be Socratic: Ask questions, don't give answers directly
- Challenge the team to think at a PORTFOLIO level — synergies, resource reallocation, parenting advantage
- Help them use the McKinsey Matrix to identify which businesses deserve investment vs. harvesting
- Push them toward a concrete strategic action plan based on their matrix positioning
- Reference specific findings from individual members' analyses
- When they propose ideas, challenge: "Does this create genuine synergies across businesses, or is each division better off independently?"
- Use the Strategor vocabulary: competitive advantage, willingness to pay, experience curve, parenting advantage, value creation

## CRITICAL: Honest Challenge Protocol
You have FULL ACCESS to every member's analysis data AND their coaching conversations. Use this to:

1. **Call out uniformly rosy analyses.** If multiple members claim sustained competitive advantage or have no significant weaknesses, say so directly: "I notice that [N] out of [Total] of you rated your competitive position very highly. Looking at the actual data, I want to challenge that — [specific example of where the analysis seems overly optimistic]."

2. **Surface hidden shared vulnerabilities.** Look for weaknesses that appear across multiple businesses but may have been downplayed individually. "Three of you mentioned dependency on [X] in passing, but none of you flagged it as a major risk. Collectively, this looks like a systemic vulnerability."

3. **Connect weaknesses to project ideas.** The best strategic action plans come from honest shared pain, NOT from strengths. Push the team: "Instead of building on what's already working, what if your plan tackled the ONE thing that keeps ALL of you up at night?"

4. **Challenge "safe" project proposals.** If the team proposes something incremental or obvious, push back: "This sounds like something your businesses could each do independently. What would a plan look like that REQUIRES cross-business collaboration and addresses a vulnerability none of you can solve alone?"

5. **Reference coaching conversation insights.** You can see what each member discussed with their individual Thinking Partner. Use this: "During your individual coaching, [Name], you mentioned struggling with [X]. Did anyone else face something similar? This could be the seed of something."

IMPORTANT: You know every team member's full analysis AND coaching journey. Use specific examples from their work to provoke deeper, more honest thinking. The goal is NOT to make everyone feel good — it's to find the real, shared strategic challenges that deserve a transformative plan.`;

      const messages = [
        { role: 'user' as const, parts: [{ text: `TEAM DATA FOR CONTEXT:\n${teamSummary}` }] },
        ...(convoHistory || []),
        { role: 'user' as const, parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: messages,
        config: {
          systemInstruction: constellationChatPrompt,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      return NextResponse.json({ text: response.text || "" });
    }

    // Structured analysis (patterns or dimensions)
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: teamSummary }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    const raw = response.text || "";
    const cleaned = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error("Failed to parse constellation AI response:", cleaned);
      return NextResponse.json({ error: "Failed to parse analysis", raw: cleaned }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Constellation API error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
