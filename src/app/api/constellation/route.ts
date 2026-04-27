import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const ai = new GoogleGenAI({});

// ── Level 2: Pattern Recognition Prompt ──
const PATTERN_PROMPT = `You are a senior strategy consultant analyzing a GROUP of business divisions within Toyota Tsusho Corporation (TTC).
You have access to each team member's complete strategic analysis data AND their deep coaching conversation history.

Your task: Identify cross-divisional PATTERNS that the team cannot see individually. Look for:
1. "Exploit" Opportunities: Shared vulnerabilities, redundant resources, common problems to solve internally.
2. "Explore" Opportunities: Hidden synergies, complementary strengths, new combinations that could create new value.

Look specifically at their CHAT HISTORY for things they debated, struggled with, or mentioned casually that connect across divisions.

Return ONLY valid JSON (no markdown fences). Structure:

{
  "teamNarrative": "<3-4 sentence strategic narrative about the team's collective strategic position, focusing on the tension between their shared risks and potential synergies.>",
  "exploitInsights": [
    { "title": "<short problem/vulnerability name>", "description": "<2 sentences explaining the shared vulnerability found across members>", "divisions": ["<divisions affected>"] }
  ],
  "exploreInsights": [
    { "title": "<short synergy/opportunity name>", "description": "<2 sentences explaining how members could combine strengths or unlock new value>", "divisions": ["<divisions affected>"] }
  ]
}

Be rigorous. Look for REAL patterns, especially surprising ones found in their chat conversations, not forced connections.`;

// ── Level 3: Project Theme Forge Prompt ──
const DIMENSION_PROMPT = `You are a senior strategy consultant at Toyota Tsusho Corporation (TTC).
You are helping a GALP team map a specific strategic tension/dilemma to TTC's Mid-Term Business Plan "4 Higher Dimensions":

① GROWTH INVESTMENT — Elevate unique competitiveness + synergies across value domains (Core, Nature, Social)
② CAPITAL POLICIES — Optimize capital allocation, improve ROIC, shareholder returns
③ HUMAN CAPITAL & ORGANIZATION — Build people, culture, cross-functional collaboration, engagement
④ SUSTAINABILITY MANAGEMENT — ESG integration, circular economy leadership, carbon neutrality

The team has identified a key strategic tension (an insight from their portfolio).
Your task: Map this tension to the 4 Higher Dimensions and generate concrete GALP Action Learning Project seeds that address it.

Return ONLY valid JSON:

{
  "tensionMapped": {
    "dimensionsImpacted": ["①", "②", "③", "④"],
    "rationale": "<2-3 sentences explaining why this specific tension impacts these dimensions>"
  },
  "projectSeeds": [
    {
      "title": "<compelling project title address this tension>",
      "type": "<Exploration|Exploitation>",
      "hypothesis": "<If we do X across our divisions, we can achieve Y>",
      "higherDimensionLeap": "<how this project goes beyond basic optimization to true TTC transformation>"
    }
  ],
  "coachingQuestions": [
    "<provocative question to push the team's thinking further regarding this project>"
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

    // ── SWOT Clustering: fast path (no chat history needed) ──
    if (action === 'cluster-swot') {
      const { points, category } = body;
      if (!points || !Array.isArray(points) || points.length === 0) {
        return NextResponse.json({ clusters: [] });
      }

      const numbered = points.map((p: { point: string; business: string }, i: number) => 
        `${i}. [${p.business}] ${p.point}`
      ).join('\n');

      const clusterPrompt = `You are analyzing ${category.toUpperCase()} from multiple business divisions.
Group these points into thematic clusters based on MEANING (not just keyword matches).
Points may be in different languages — group by concept regardless of language.

Points:
${numbered}

Return ONLY valid JSON (no markdown fences):
{"clusters":[{"title":"<3-6 word theme>","description":"<max 15 words>","pointIndices":[<indices>]}]}

Rules:
- Group points sharing the SAME strategic concept regardless of language
- Each point belongs to exactly ONE cluster
- Unique points get their own single-point cluster
- Order clusters by size (largest first)
- Keep descriptions VERY SHORT (under 15 words)
- Titles should be strategic and insightful`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: clusterPrompt }] }],
        config: { temperature: 0.1, maxOutputTokens: 4096 },
      });

      const raw = (response.text || '').replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(raw);
        return NextResponse.json(parsed);
      } catch {
        // Attempt to repair truncated JSON
        try {
          const repaired = raw.substring(0, raw.lastIndexOf('}') + 1) + ']}';
          const parsed = JSON.parse(repaired);
          console.warn('Repaired truncated SWOT clusters JSON');
          return NextResponse.json(parsed);
        } catch {
          console.error('Failed to parse SWOT clusters:', raw.substring(0, 200));
          return NextResponse.json({ clusters: [] });
        }
      }
    }

    // Fetch chat history for all members in parallel (via admin SDK)
    const chatHistories: Record<string, any> = {};
    const CHAT_FETCH_TIMEOUT = 5000; // 5s timeout per member
    
    const chatPromises = cards
      .filter((card: any) => card.ownerUID)
      .map(async (card: any) => {
        try {
          const timeoutPromise = new Promise<Record<string, any>>((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), CHAT_FETCH_TIMEOUT)
          );
          const fetchPromise = fetchChatHistory(card.ownerUID);
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          chatHistories[card.ownerUID] = result;
        } catch (e) {
          // Silently skip — chat history is optional enrichment
          console.warn(`Skipped chat history for ${card.ownerUID}: ${(e as Error).message}`);
        }
      });
    
    await Promise.allSettled(chatPromises);

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
          maxOutputTokens: 1024,
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
      const { message, chatHistory: convoHistory, zone, zoneDivisions } = body;
      
      // Zone-specific context injection
      const zoneContextMap: Record<string, string> = {
        core: `The team is discussing the CORE VALUE domain. This domain contains divisions focused on NEXT-GENERATION MOBILITY — automotive, metals processing, supply chain, and digital solutions. The divisions in this domain are: ${zoneDivisions || 'unknown'}. Focus your coaching on: mobility transformation, Toyota Group synergies, supply chain resilience, semiconductor strategy, and competitive moats.`,
        social: `The team is discussing the SOCIAL VALUE domain. This domain contains divisions focused on SOLVING SOCIAL ISSUES — circular economy, healthcare, Africa development, and community impact. The divisions in this domain are: ${zoneDivisions || 'unknown'}. Focus your coaching on: circular economy leadership (Radius Recycling integration), Global South expansion, healthcare access, and scaling social impact businesses profitably.`,
        nature: `The team is discussing the NATURE VALUE domain. This domain contains divisions focused on ENVIRONMENTAL SOLUTIONS — renewable energy, carbon neutrality, and energy management. The divisions in this domain are: ${zoneDivisions || 'unknown'}. Focus your coaching on: renewable energy pioneering, carbon neutrality positioning, green infrastructure, and how to fund nature value businesses from core value cash flows.`,
      };
      const zoneContext = zone && zoneContextMap[zone] ? `\n\n## ZONE CONTEXT\n${zoneContextMap[zone]}\n` : '';

      const constellationChatPrompt = `You are the TEAM Thinking Partner for a GALP team at Toyota Tsusho Corporation.
You have access to ALL team members' individual analyses AND their coaching conversations.
You're now facilitating a GROUP discussion to identify cross-divisional patterns and build toward a Group Action Learning Project.
${zoneContext}
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

## CRITICAL: Honest Challenge Protocol
You have FULL ACCESS to every member's analysis data AND their coaching conversations. Use this to:

1. **Call out uniformly rosy analyses.** If multiple members claim sustained competitive advantage or have no significant weaknesses, say so directly.

2. **Surface hidden shared vulnerabilities.** Look for weaknesses that appear across multiple divisions but may have been downplayed individually.

3. **Connect weaknesses to project ideas.** The best Group Action Learning Projects come from honest shared pain, NOT from strengths.

4. **Challenge "safe" project proposals.** If the team proposes something incremental or obvious, push back.

5. **Reference coaching conversation insights.** You can see what each member discussed with their individual Thinking Partner. Use specific examples.

IMPORTANT: Keep responses focused and concise (150-250 words). Be direct and provocative.`;

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
    const userText = action === 'dimensions' && body.tension 
      ? `Selected Strategic Tension for Project:\n${body.tension}\n\nTeam Data Context:\n${teamSummary}`
      : teamSummary;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: userText }] }],
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
