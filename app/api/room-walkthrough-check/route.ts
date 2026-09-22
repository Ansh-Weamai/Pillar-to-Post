import { NextResponse } from "next/server";
import {
  getClient,
  MODEL,
  RoomWalkthroughModelResponseSchema,
  buildRoomWalkthroughPrompt,
  RETRY_JSON_ONLY_SUFFIX,
  parseDataUrl,
} from "@/app/lib/gemini";
import type { RoomWalkthroughCheckResponse, RoomWalkthroughResult } from "@/app/lib/types";

const MAX_IMAGES = 6;

type ImagePart = { inlineData: { mimeType: string; data: string } };

async function callGemini(ai: NonNullable<ReturnType<typeof getClient>>, promptText: string, imageParts: ImagePart[]) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: promptText }, ...imageParts] }],
    config: { responseMimeType: "application/json" },
  });

  try {
    return RoomWalkthroughModelResponseSchema.safeParse(JSON.parse(response.text ?? ""));
  } catch {
    return { success: false as const };
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const room: string | undefined = body?.room;
  const images: string[] | undefined = body?.images;

  if (!room || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: true, message: "room and at least one image are required" } satisfies RoomWalkthroughCheckResponse);
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: true, message: `at most ${MAX_IMAGES} images are allowed per room` } satisfies RoomWalkthroughCheckResponse);
  }

  const ai = getClient(2);
  if (!ai) {
    return NextResponse.json({ error: true, message: "GEMINI_API_KEY_2 not configured." } satisfies RoomWalkthroughCheckResponse);
  }

  try {
    const imageParts: ImagePart[] = images.map((dataUrl) => {
      const { mimeType, data } = parseDataUrl(dataUrl);
      return { inlineData: { mimeType, data } };
    });
    const basePrompt = buildRoomWalkthroughPrompt(room, images.length);

    let parsed = await callGemini(ai, basePrompt, imageParts);
    if (!parsed.success) {
      parsed = await callGemini(ai, `${basePrompt}\n\n${RETRY_JSON_ONLY_SUFFIX}`, imageParts);
    }
    if (!parsed.success) {
      console.error("[room-walkthrough-check]: model response failed schema validation twice");
      return NextResponse.json({ error: true, message: "Couldn't parse the model's response." } satisfies RoomWalkthroughCheckResponse);
    }

    const result: RoomWalkthroughResult = {
      ...parsed.data,
      detected_elements: parsed.data.detected_elements.slice(0, 8),
    };

    return NextResponse.json({ result } satisfies RoomWalkthroughCheckResponse);
  } catch (e) {
    console.error("[room-walkthrough-check]:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: true, message: "The check failed. Try again." } satisfies RoomWalkthroughCheckResponse);
  }
}
