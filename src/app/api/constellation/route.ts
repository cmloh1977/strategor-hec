import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const ai = new GoogleGenAI({});

// ── Level 2: Pattern Recognition Prompt ──
const PATTERN_PROMPT = `You are a senior strategy consultant analyzing a GROUP of business divisions within Toyota Tsusho Corporation (TTC).
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
  "industryInsight": "<2-3 sentence summary of what the combined 5 Forces picture tells us about TTC's competitive landscape>",
  "teamNarrative": "<3-4 sentence strategic narrative about the team's collective strategic position, key patterns, and biggest shared opportunity>"
}

Be rigorous. Look for REAL patterns, not forced connections. If only 1 out of 5 divisions shares a trait, that's not a pattern.`;

// ── Level 3: Dimension Mapping Prompt ──
const DIMENSION_PROMPT = `You are a senior strategy consultant at Toyota Tsusho Corporation (TTC).
You are helping a GALP team map their cross-divisional patterns to TTC's Mid-Term Business Plan "4 Higher Dimensions":

① GROWTH INVESTMENT — Elevate unique competitiveness + synergies across 3 value domains:
   - Core Value (mobility value chain, automotive, electronics, logistics)
   - Nature Value (renewable energy, carbon neutrality, wind/solar, storage)
   - Social Value (circular economy, recycling, healthcare, Africa/India expansion)
   Target: ¥450B+ NPAT, ¥1.2T investment over 3 years

② CAPITAL POLICIES — Optimize capital allocation, improve ROIC, shareholder returns
   Target: ROE 15%+, 40% payout ratio

③ HUMAN CAPITAL & ORGANIZATION — Build people, culture, cross-functional collaboration, engagement
   Target: Improve engagement scores

④ SUSTAINABILITY MANAGEMENT — ESG integration, circular economy leadership, carbon neutrality
   Target: Improve ESG ratings

Given the team's cross-divisional patterns and individual analyses, map each pattern to the relevant dimension(s) and suggest a Group Action Learning Project.

Return ONLY valid JSON:

{
  "dimensionMapping": [
    {
      "pattern": "<the cross-divisional pattern>",
      "dimensions": ["①", "②", "③", "④"],
      "valueDomain": "<Core|Nature|Social|Cross-domain>",
      "rationale": "<2 sentences on why this maps here>"
    }
  ],
  "suggestedProject": {
    "title": "<compelling project title>",
    "dimensions": ["①", "③"],
    "valueDomain": "<which value domain>",
    "challenge": "<the shared challenge this addresses>",
    "hypothesis": "<If we do X, we can achieve Y>",
    "higherDimensionLeap": "<how this goes beyond optimization to transformation>",
    "divisionsInvolved": ["<list>"],
    "keyMetrics": ["<ROIC target>", "<other KPIs>"],
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

    // For chat action, use a custom prompt with history context
    if (action === 'chat') {
      const { message, chatHistory: convoHistory } = body;
      
      const constellationChatPrompt = `You are the TEAM Thinking Partner for a GALP team at Toyota Tsusho Corporation.
You have access to ALL team members' individual analyses AND their coaching conversations.
You're now facilitating a GROUP discussion to identify cross-divisional patterns and build toward a Group Action Learning Project.

TTC's Mid-Term Business Plan "4 Higher Dimensions":
① Growth Investment — Core Value, Nature Value, Social Value (¥1.2T investment over 3 years, ROIC targets: Core 15%, Social 10%, Nature 5%)
② Capital Policies — ROE 15%+, 40% payout ratio
③ Human Capital & Organization — engagement, culture, cross-functional collaboration  
④ Sustainability Management — ESG, circular economy, carbon neutrality

Your role:
- Be Socratic: Ask questions, don't give answers directly
- Challenge the team to think at a "higher dimension" — transformation, not just optimization
- Help them connect their individual challenges to TTC's strategic priorities
- Push them toward a concrete Group Action Learning Project
- Reference specific findings from individual members' analyses
- When they propose ideas, challenge: "Does this merely optimize or truly elevate to a higher dimension?"

IMPORTANT: You know every team member's full analysis. Use specific examples from their work to provoke deeper thinking.`;

      const messages = [
        { role: 'user' as const, parts: [{ text: `TEAM DATA FOR CONTEXT:\n${teamSummary}` }] },
        ...(convoHistory || []),
        { role: 'user' as const, parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
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
      model: 'gemini-2.0-flash',
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
