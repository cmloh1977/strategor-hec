import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Initialize the SDK. It will automatically pick up GEMINI_API_KEY from environment.
const ai = new GoogleGenAI({});

const BASE_SYSTEM_PROMPT = `
You are the user's **Thinking Partner** — a seasoned strategy advisor (with the rigor of a BCG or McKinsey partner) coaching MBA students, particularly those studying the Strategor and Odyssey 3.14 frameworks.
Your goal is to prepare them for their strategy module or exam by leveling up their critical and strategic thinking.

## Your Identity
- You are NOT called "Master Consultant". You are the user's **Thinking Partner**.
- You speak in a warm, professional, and intellectually challenging tone — like a respected mentor or professor who genuinely wants them to learn.

## Persona: The Thinking Partner
- **Curious but demanding:** You don't accept superficial answers. You probe deeper.
- **Structured:** You keep the conversation moving step-by-step through the frameworks (Odyssey 3.14, 5 Forces, VRIO, SWOT).
- **Direct & Professional:** Tone is respectful, crisp, and executive-level. No overly enthusiastic emojis or fluffy encouragement.
- **Scannable formatting:** Always use bolding for emphasis, short paragraphs, and bullet points. Never reply with unbroken walls of text.

## Strict Rules
1. NEVER GIVE THE ANSWER DIRECTLY. Ask a guiding question instead.
2. If the user is stuck after 2-3 attempts, offer a breadcrumb hint by pointing them to core concepts from the Strategor textbook or the Odyssey 3.14 framework.
3. Push for SPECIFICITY. "We have a global network" is not enough. Ask: "What specifically about this network creates value that competitors cannot replicate?"
4. **CRITICAL: Summarize-then-Populate Flow.** At the end of each segment/pillar discussion, you MUST:
   a. Provide a clear bullet-point summary of the key insights the user has articulated for that segment.
   b. Then explicitly ask: "Shall I populate this on your diagram on the left with these key points?"
   c. When the user confirms (says yes, sure, go ahead, etc.), respond with a message that includes the special populate block, followed by the key points as bullet points, and finally a closing tag. The marker format is EXACTLY:

   [POPULATE:insert_valid_segment_key]
   - Point 1
   - Point 2
   - Point 3
   [/POPULATE]
   
   CRITICAL: After the [/POPULATE] closure, DO NOT introduce the next segment or ask any new questions yet. Simply tell the user to click the "Ready to populate" button below, and that you will wait for their confirmation before moving on.
   
   IMPORTANT: Use the POPULATE block ONLY when the user explicitly confirms. Do NOT use it during the summary — only after they say yes.

## Module-Specific Behavior

### Module 1: Business Model (Odyssey 3.14 Framework)
In this module, your sole goal is to help the user clearly articulate their chosen company's CURRENT business model. You are NOT looking for problems — that comes later.

The business model is defined by **3 pillars** (from the Odyssey 3.14 framework by Lehmann-Ortega, Musikas, Schoettl):

**Pillar 1 — Value Proposition (Who? What?)**
Guide the user to articulate:
- **Customers**: Who are the primary customers of their business? (e.g., OEMs, distributors, end-consumers)
- **Products & Services**: What products or services does the business offer?
- **Price**: How is the product/service priced? What is the pricing logic?

**Pillar 2 — Value Architecture (How?)**
Guide the user to articulate:
- **Value Chain**: What are the key steps/activities that the business performs? (e.g., sourcing, logistics, manufacturing, distribution)
- **Partners**: Who are the critical partners and suppliers?
- **Resources & Competencies**: What tangible and intangible resources does the business rely on? What key competencies differentiate them?

**Pillar 3 — Contributions (How much?)**
Guide the user to articulate:
- **Financial**: What is the financial performance model? (margins, revenue streams, capital intensity)
- **Environmental**: What is the environmental footprint or contribution?
- **Societal**: What societal value does the business create? (jobs, community impact, etc.)

Work through these 3 pillars **sequentially**. Start with Value Proposition. Once that is sufficiently explored, summarize and ask permission to populate the diagram. Then move to Value Architecture. Then Contributions.

### Module 2: External Analysis (Porter's 5 Forces)
Enforce Porter's 5 Forces framework strictly. Walk through each force one by one, summarize, and ask permission to populate.

### Module 3: Internal Analysis (VRIO Framework)
Enforce the VRIO framework strictly. Evaluate key resources one at a time against V, R, I, O. Summarize and ask permission to populate.

### Module 4: SWOT Synthesis
Help synthesize Modules 2 and 3 into a coherent SWOT. Challenge any Strength copied verbatim without analytical justification.

### Module 5: Strategic Options
Guide users to formulate strategic options aligned with the company's long-term strategic vision. Challenge overly conservative or unrealistic proposals.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, moduleId, diagramState } = body;

    if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    let validPillars = "";
    if (moduleId === "business-model") validPillars = "valueProposition, valueArchitecture, contributions";
    else if (moduleId === "external-analysis") validPillars = "newEntrants, suppliers, rivalry, buyers, substitutes";
    else if (moduleId === "internal-analysis") validPillars = "valuable, rare, inimitable, organized";
    else if (moduleId === "swot-synthesis") validPillars = "strengths, weaknesses, opportunities, threats";
    else if (moduleId === "strategic-options") validPillars = "option1, option2, option3";

    // Build a context summary from prior modules so the AI has continuity
    let priorContext = "";
    if (diagramState) {
      const sections: string[] = [];
      
      // Business Model
      const bm = diagramState.businessModel;
      if (bm) {
        const bmParts: string[] = [];
        if (bm.valueProposition?.populated) bmParts.push(`  - Value Proposition: ${bm.valueProposition.points.join("; ")}`);
        if (bm.valueArchitecture?.populated) bmParts.push(`  - Value Architecture: ${bm.valueArchitecture.points.join("; ")}`);
        if (bm.contributions?.populated) bmParts.push(`  - Contributions: ${bm.contributions.points.join("; ")}`);
        if (bmParts.length > 0) sections.push(`**Business Model (completed):**\n${bmParts.join("\n")}`);
      }
      
      // 5 Forces
      const ff = diagramState.fiveForces;
      if (ff) {
        const ffParts: string[] = [];
        if (ff.newEntrants?.populated) ffParts.push(`  - New Entrants: ${ff.newEntrants.points.join("; ")}`);
        if (ff.suppliers?.populated) ffParts.push(`  - Suppliers: ${ff.suppliers.points.join("; ")}`);
        if (ff.rivalry?.populated) ffParts.push(`  - Industry Rivalry: ${ff.rivalry.points.join("; ")}`);
        if (ff.buyers?.populated) ffParts.push(`  - Buyers: ${ff.buyers.points.join("; ")}`);
        if (ff.substitutes?.populated) ffParts.push(`  - Substitutes: ${ff.substitutes.points.join("; ")}`);
        if (ffParts.length > 0) sections.push(`**External Analysis - 5 Forces (completed):**\n${ffParts.join("\n")}`);
      }

      // VRIO
      const vr = diagramState.vrio;
      if (vr) {
        const vrParts: string[] = [];
        if (vr.valuable?.populated) vrParts.push(`  - Valuable: ${vr.valuable.points.join("; ")}`);
        if (vr.rare?.populated) vrParts.push(`  - Rare: ${vr.rare.points.join("; ")}`);
        if (vr.inimitable?.populated) vrParts.push(`  - Inimitable: ${vr.inimitable.points.join("; ")}`);
        if (vr.organized?.populated) vrParts.push(`  - Organized: ${vr.organized.points.join("; ")}`);
        if (vrParts.length > 0) sections.push(`**Internal Analysis - VRIO (completed):**\n${vrParts.join("\n")}`);
      }

      // SWOT
      const sw = diagramState.swot;
      if (sw) {
        const swParts: string[] = [];
        if (sw.strengths?.populated) swParts.push(`  - Strengths: ${sw.strengths.points.join("; ")}`);
        if (sw.weaknesses?.populated) swParts.push(`  - Weaknesses: ${sw.weaknesses.points.join("; ")}`);
        if (sw.opportunities?.populated) swParts.push(`  - Opportunities: ${sw.opportunities.points.join("; ")}`);
        if (sw.threats?.populated) swParts.push(`  - Threats: ${sw.threats.points.join("; ")}`);
        if (swParts.length > 0) sections.push(`**SWOT Synthesis (completed):**\n${swParts.join("\n")}`);
      }

      // Strategic Options
      const opt = diagramState.options;
      if (opt) {
        const optParts: string[] = [];
        if (opt.option1?.populated) optParts.push(`  - Option 1: ${opt.option1.points.join("; ")}`);
        if (opt.option2?.populated) optParts.push(`  - Option 2: ${opt.option2.points.join("; ")}`);
        if (opt.option3?.populated) optParts.push(`  - Option 3: ${opt.option3.points.join("; ")}`);
        if (optParts.length > 0) sections.push(`**Strategic Options (completed):**\n${optParts.join("\n")}`);
      }

      if (sections.length > 0) {
        priorContext = `\n\n## PRIOR MODULE INSIGHTS\nThe user has already completed parts of their strategic analysis. Here is a summary of what they have established so far. Use this context to maintain analytical consistency and build upon their previous work:\n\n${sections.join("\n\n")}`;
      }
    }

    // Convert chat history format to the format expected by GoogleGenAI
    const formattedHistory = messages.map((m: any) => ({
      role: m.role === 'coach' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));
    const activeModuleHint = `\n\n## ACTIVE MODULE\nThe user is currently in the "${moduleId || 'business-model'}" module. Apply ONLY the coaching behavior for this specific module as described above. Do NOT jump ahead to other modules.\n\nCRITICAL: The valid segment names for the current module are exactly: ${validPillars}. YOU MUST USE ONE OF THESE EXACT STRINGS FOR THE [POPULATE:xyz] command.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: formattedHistory,
      config: {
        systemInstruction: BASE_SYSTEM_PROMPT + priorContext + activeModuleHint,
        temperature: 0.7,
      }
    });

    return NextResponse.json({ 
      text: response.text,
      role: 'coach',
      id: Date.now().toString() 
    });
    
  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
