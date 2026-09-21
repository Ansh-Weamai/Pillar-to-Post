import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getClient, MODEL, VisionResponseSchema, buildPhotoCheckPrompt, parseDataUrl } from "@/app/lib/gemini";
import type { ChecklistEntry, ItemUpdate } from "@/app/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const location: string | undefined = body?.location;
  const images: string[] | undefined = body?.images;

  if (!location || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "location and at least one image are required" }, { status: 400 });
  }

  const checklistRaw = await fs.readFile(path.join(process.cwd(), "data", "checklist.json"), "utf-8");
  const checklist: ChecklistEntry[] = JSON.parse(checklistRaw);
  const entry = checklist.find((e) => e.location === location);

  if (!entry) {
    return NextResponse.json({ error: `unknown location "${location}"` }, { status: 400 });
  }

  const ai = getClient();
  if (!ai) {
    const updates: ItemUpdate[] = entry.required_items.map((item) => ({
      location,
      required_item: item,
      status: "partial",
      confidence: 0,
      source: "upload",
    }));
    return NextResponse.json({ updates });
  }

  const parts = images.map((dataUrl) => {
    const { mimeType, data } = parseDataUrl(dataUrl);
    return { inlineData: { mimeType, data } };
  });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: buildPhotoCheckPrompt(location, entry.required_items, images.length > 1) }, ...parts],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const parsed = VisionResponseSchema.safeParse(JSON.parse(response.text ?? ""));
    const resultByItem = new Map(parsed.success ? parsed.data.results.map((r) => [r.required_item, r]) : []);

    const updates: ItemUpdate[] = entry.required_items.map((item) => {
      const result = resultByItem.get(item);
      if (!result) {
        return { location, required_item: item, status: "partial", confidence: 0, source: "upload" };
      }
      return {
        location,
        required_item: item,
        status: result.visible ? "confirmed" : "partial",
        confidence: result.confidence,
        source: "upload",
      };
    });

    return NextResponse.json({ updates });
  } catch {
    const updates: ItemUpdate[] = entry.required_items.map((item) => ({
      location,
      required_item: item,
      status: "partial",
      confidence: 0,
      source: "upload",
    }));
    return NextResponse.json({ updates });
  }
}
