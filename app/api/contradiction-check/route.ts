import { NextResponse } from "next/server";
import {
  getClient,
  MODEL,
  ContradictionModelResponseSchema,
  buildContradictionCheckPrompt,
  RETRY_JSON_ONLY_SUFFIX,
  parseDataUrl,
} from "@/app/lib/gemini";
import { contradictionAction } from "@/app/lib/contradictionScoring";
import type { ContradictionCheckResponse } from "@/app/lib/types";

async function callGemini(
  ai: NonNullable<ReturnType<typeof getClient>>,
  promptText: string,
  imagePart: { inlineData: { mimeType: string; data: string } }
) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: promptText }, imagePart] }],
    config: { responseMimeType: "application/json" },
  });

  try {
    return ContradictionModelResponseSchema.safeParse(JSON.parse(response.text ?? ""));
  } catch {
    return { success: false as const };
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const image: string | undefined = body?.image;
  const findingText: string | undefined = body?.findingText;

  if (!image || !findingText) {
    return NextResponse.json({ error: "image and findingText are required" }, { status: 400 });
  }

  const ai = getClient();
  if (!ai) {
    const response: ContradictionCheckResponse = { error: true, message: "GEMINI_API_KEY not configured." };
    return NextResponse.json(response);
  }

  try {
    const { mimeType, data } = parseDataUrl(image);
    const imagePart = { inlineData: { mimeType, data } };
    const basePrompt = buildContradictionCheckPrompt(findingText);

    let parsed = await callGemini(ai, basePrompt, imagePart);
    if (!parsed.success) {
      parsed = await callGemini(ai, `${basePrompt}\n\n${RETRY_JSON_ONLY_SUFFIX}`, imagePart);
    }
    if (!parsed.success) {
      console.error("[contradiction-check]: model response failed schema validation twice");
      const response: ContradictionCheckResponse = { error: true, message: "Couldn't parse the model's response." };
      return NextResponse.json(response);
    }

    const { verdict, confidence, reasoning, omissions } = parsed.data;
    const response: ContradictionCheckResponse = {
      result: {
        verdict,
        confidence,
        reasoning,
        omissions,
        recommended_action: contradictionAction(verdict, confidence, omissions),
      },
    };
    return NextResponse.json(response);
  } catch (e) {
    console.error("[contradiction-check]:", e instanceof Error ? e.message : e);
    const response: ContradictionCheckResponse = { error: true, message: "The check failed. Try again." };
    return NextResponse.json(response);
  }
}
