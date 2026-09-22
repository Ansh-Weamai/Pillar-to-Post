import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getClient, MODEL, VisionResponseSchema, buildPhotoCheckPrompt } from "@/app/lib/gemini";
import type { ChecklistEntry, ItemUpdate } from "@/app/lib/types";

type TourEntry = { location: string; photos: string[] };
type ItemVerdict = { visible: boolean; confidence: number; reasoning: string };

function mimeTypeForPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function unparseableMap(requiredItems: string[], reasoning: string): Map<string, ItemVerdict> {
  return new Map(requiredItems.map((item) => [item, { visible: false, confidence: 0, reasoning }]));
}

async function checkPhoto(
  ai: NonNullable<ReturnType<typeof getClient>>,
  location: string,
  requiredItems: string[],
  photoPath: string
): Promise<Map<string, ItemVerdict>> {
  let base64: string;
  try {
    const absPath = path.join(process.cwd(), "public", photoPath);
    base64 = (await fs.readFile(absPath)).toString("base64");
  } catch {
    return unparseableMap(requiredItems, "photo file missing");
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPhotoCheckPrompt(location, requiredItems, false) },
            { inlineData: { mimeType: mimeTypeForPath(photoPath), data: base64 } },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const parsed = VisionResponseSchema.safeParse(JSON.parse(response.text ?? ""));
    if (!parsed.success) return unparseableMap(requiredItems, "model response unparseable");

    const map = unparseableMap(requiredItems, "item not returned by model");
    for (const result of parsed.data.results) {
      map.set(result.required_item, {
        visible: result.visible,
        confidence: result.confidence,
        reasoning: result.reasoning,
      });
    }
    return map;
  } catch {
    return unparseableMap(requiredItems, "vision call failed");
  }
}

export async function POST() {
  const [checklistRaw, tourRaw] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "data", "checklist.json"), "utf-8"),
    fs.readFile(path.join(process.cwd(), "data", "sample-tour.json"), "utf-8"),
  ]);

  const checklist: ChecklistEntry[] = JSON.parse(checklistRaw);
  const tour: TourEntry[] = JSON.parse(tourRaw);
  const tourByLocation = new Map(tour.map((t) => [t.location, t]));

  const ai = getClient(1);

  // Pass A: only locations present in the tour proceed to Pass B (one Gemini call per photo, run in parallel).
  const taggedEntries = checklist.filter((entry) => tourByLocation.has(entry.location));

  const taggedResults = await Promise.all(
    taggedEntries.map(async (entry) => {
      const tourEntry = tourByLocation.get(entry.location)!;
      const thumbnail = tourEntry.photos[0];

      const itemResults = new Map<string, ItemVerdict>();
      if (!ai) {
        for (const item of entry.required_items) {
          itemResults.set(item, { visible: false, confidence: 0, reasoning: "GEMINI_API_KEY_1 not configured" });
        }
      } else {
        const perPhotoMaps = await Promise.all(
          tourEntry.photos.map((photo) => checkPhoto(ai, entry.location, entry.required_items, photo))
        );
        for (const item of entry.required_items) {
          let best: ItemVerdict = { visible: false, confidence: 0, reasoning: "not checked" };
          for (const map of perPhotoMaps) {
            const r = map.get(item);
            if (!r) continue;
            if (r.visible && !best.visible) best = r;
            else if (r.visible === best.visible && r.confidence > best.confidence) best = r;
          }
          itemResults.set(item, best);
        }
      }

      return { location: entry.location, thumbnail, itemResults };
    })
  );

  const resultsByLocation = new Map(taggedResults.map((r) => [r.location, r]));

  const updates: ItemUpdate[] = [];
  for (const entry of checklist) {
    const tagged = resultsByLocation.get(entry.location);
    for (const item of entry.required_items) {
      if (!tagged) {
        updates.push({ location: entry.location, required_item: item, status: "missing", source: "demo" });
        continue;
      }
      const verdict = tagged.itemResults.get(item)!;
      updates.push({
        location: entry.location,
        required_item: item,
        status: verdict.visible ? "confirmed" : "partial",
        confidence: verdict.confidence,
        thumbnail: tagged.thumbnail,
        source: "demo",
      });
    }
  }

  return NextResponse.json({ updates });
}
