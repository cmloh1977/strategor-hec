import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({});

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  fr: "French",
  zh: "Chinese (Simplified)",
};

export async function POST(req: Request) {
  try {
    const { points, targetLanguage, sourceLanguage } = await req.json();

    if (!points || !Array.isArray(points) || !targetLanguage) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // If same language, return as-is
    if (targetLanguage === sourceLanguage) {
      return NextResponse.json({ translated: points });
    }

    const targetLangName = LANG_NAMES[targetLanguage] || "English";
    const numbered = points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n");

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: numbered }] }],
      config: {
        systemInstruction: `You are a professional translator for strategic business frameworks. Translate the following bullet points into ${targetLangName}. 
RULES:
- Maintain the same numbered format (1. 2. 3. etc.)
- Keep business terminology precise and professional
- Do NOT add, remove, or reorder items
- Do NOT add explanations — only translate
- Output ONLY the numbered list, nothing else`,
        temperature: 0.1,
      }
    });

    const text = response.text || "";
    // Parse numbered lines back into array
    const translated = text
      .split("\n")
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(line => line.length > 0);

    // If parsing failed, return originals
    if (translated.length !== points.length) {
      return NextResponse.json({ translated: points });
    }

    return NextResponse.json({ translated });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
