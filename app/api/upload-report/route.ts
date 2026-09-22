import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getClient, MODEL, ReportResponseSchema, buildReportCheckPrompt, parseDataUrl } from "@/app/lib/gemini";
import type { ChecklistEntry, ItemUpdate } from "@/app/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const dataUrl: string | undefined = body?.dataUrl;

  if (!dataUrl) {
    return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });
  }

  try {
    const checklistRaw = await fs.readFile(path.join(process.cwd(), "data", "checklist.json"), "utf-8");
    const checklist: ChecklistEntry[] = JSON.parse(checklistRaw);

    const allItems = checklist.flatMap((entry) =>
      entry.required_items.map((item) => ({ location: entry.location, required_item: item }))
    );

    const ai = getClient(1);
    if (!ai) {
      const updates: ItemUpdate[] = allItems.map((i) => ({ ...i, status: "missing", source: "report", condition: null }));
      return NextResponse.json({ updates });
    }

    const { mimeType, data } = parseDataUrl(dataUrl);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: buildReportCheckPrompt(checklist) }, { inlineData: { mimeType, data } }],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const parsed = ReportResponseSchema.safeParse(JSON.parse(response.text ?? ""));
    const resultByKey = new Map(
      parsed.success ? parsed.data.results.map((r) => [`${r.location}::${r.required_item}`, r]) : []
    );

    const updates: ItemUpdate[] = allItems.map(({ location, required_item }) => {
      const result = resultByKey.get(`${location}::${required_item}`);
      if (!result || !result.documented) {
        return { location, required_item, status: "missing", source: "report", condition: null };
      }
      return {
        location,
        required_item,
        status: "confirmed",
        confidence: result.confidence,
        source: "report",
        condition: result.condition,
      };
    });

    return NextResponse.json({ updates });
  } catch (e) {
    console.error("[upload-report]:", e instanceof Error ? e.message : e);
    return NextResponse.json({ updates: [] }, { status: 500 });
  }
}
