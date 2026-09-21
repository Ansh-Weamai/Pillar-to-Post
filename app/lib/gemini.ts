import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ChecklistEntry } from "@/app/lib/types";

export const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

export function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

export const ItemResultSchema = z.object({
  required_item: z.string(),
  visible: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const VisionResponseSchema = z.object({
  results: z.array(ItemResultSchema),
});

export const ReportItemResultSchema = z.object({
  location: z.string(),
  required_item: z.string(),
  documented: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const ReportResponseSchema = z.object({
  results: z.array(ReportItemResultSchema),
});

export function buildPhotoCheckPrompt(location: string, requiredItems: string[], multiPhoto: boolean) {
  return `You are doing a second-pass quality check on home inspection photos. You are
NOT diagnosing the property — you are only checking whether specific items
are visibly present in the photo${multiPhoto ? "s" : ""}.

Location tagged for ${multiPhoto ? "these photos" : "this photo"}: ${location}
Items to check for: ${requiredItems.join(", ")}
${multiPhoto ? "\nThese images are ALL from the same location. An item counts as visible if it appears in ANY of them.\n" : ""}
For EACH item, decide if it is visibly identifiable. Respond ONLY with JSON
matching this exact shape, one object per item, no other text:

{
  "results": [
    {
      "required_item": "<the item name, exactly as given>",
      "visible": true | false,
      "confidence": <number 0 to 1>,
      "reasoning": "<one short sentence, plain language, max 15 words>"
    }
  ]
}

If a photo shows visible UI chrome (a sidebar, a floor plan overlay, a
comments panel) around the actual room content, ignore the chrome and judge
only the photographed scene itself.`;
}

export function buildReportCheckPrompt(checklist: ChecklistEntry[]) {
  const checklistText = checklist
    .map((entry) => `- ${entry.location}: ${entry.required_items.join(", ")}`)
    .join("\n");

  return `You are looking at a home inspection report. Here is the full checklist of
locations and required items we expect to see documented:

${checklistText}

Go through the document and determine, for EACH location above:
1. Is this location discussed or photographed anywhere in the document?
2. For each required item under that location, is it visibly documented?

Respond ONLY with JSON:
{
  "results": [
    { "location": "...", "required_item": "...", "documented": true|false, "confidence": 0-1 }
  ]
}

Cover every location and every required item from the checklist above, even
ones the document never mentions (documented: false for those).`;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("invalid data URL");
  return { mimeType: match[1], data: match[2] };
}
