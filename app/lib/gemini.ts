import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ChecklistEntry } from "@/app/lib/types";

export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

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

// Feature 2 — Evidence Consistency: raw per-image model output. The model
// only reports what it observes; risk_score/status/recommended_action are
// computed deterministically afterward (see app/lib/evidenceScoring.ts).
export const EvidenceDefectSignatureSchema = z.object({
  signature: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  region: z.string(),
});

export const EvidenceCheckModelResponseSchema = z.object({
  detected_location: z.string().nullable(),
  location_confidence: z.number().min(0).max(1).nullable(),
  image_quality: z.object({
    usable: z.boolean(),
    issue: z.enum(["blurry", "too_dark", "obstructed"]).nullable(),
  }),
  defect_signatures: z.array(EvidenceDefectSignatureSchema),
  overall: z.object({
    summary: z.string(),
  }),
});

export type EvidenceCheckModelResponse = z.infer<typeof EvidenceCheckModelResponseSchema>;

// Shared across Feature 2 and Feature 3 — appended to the same prompt and
// resent once if the first response fails schema validation.
export const RETRY_JSON_ONLY_SUFFIX =
  "Your previous response could not be parsed as valid JSON. Return ONLY the JSON object, nothing else — no explanation, no markdown code fences.";

export function buildEvidenceCheckPrompt(): string {
  return `You are performing an independent visual review of a single home inspection
photo. You have NOT been told what room this is or what an inspector wrote
about it — judge only what is visible in the image itself.

Rules:
- Only report what you can actually see. If something is not visible or you
  cannot tell, do not guess — use null, or leave defect_signatures empty.
- Do not diagnose the building or claim a hidden defect exists behind a
  surface. Only describe observable evidence: staining, cracking, corrosion,
  visible leaks, missing hardware, wear, damage.
- If the photo is too blurry, dark, or obstructed to evaluate reliably, set
  image_quality.usable to false and say so — do not force an answer. When
  usable is false, defect_signatures must be an empty array.
- detected_location is your best guess of the room/area shown. If you
  genuinely cannot tell, use null rather than guessing.

Respond ONLY with JSON matching this exact shape, no markdown fences, no
extra commentary:

{
  "detected_location": "bathroom" | null,
  "location_confidence": 0.8 | null,
  "image_quality": { "usable": true, "issue": "blurry" | "too_dark" | "obstructed" | null },
  "defect_signatures": [
    {
      "signature": "water staining",
      "description": "one plain sentence, only what's visible",
      "severity": "low" | "medium" | "high",
      "confidence": 0.75,
      "region": "lower left near the base"
    }
  ],
  "overall": { "summary": "one plain sentence, max 20 words" }
}`;
}

// Feature 3 — Contradiction Flag: photo + finding text checked together in
// one call. The model reports verdict/confidence/reasoning/omissions only;
// recommended_action is computed deterministically afterward (see
// app/lib/contradictionScoring.ts) so it isn't the model self-grading.
export const OmissionSchema = z.object({
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
});

export const ContradictionModelResponseSchema = z.object({
  verdict: z.enum(["match", "mismatch"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  omissions: z.array(OmissionSchema),
});

export type ContradictionModelResponse = z.infer<typeof ContradictionModelResponseSchema>;

export function buildContradictionCheckPrompt(findingText: string): string {
  return `You are checking a home inspector's written finding against the accompanying
photo, in two directions. You are NOT inspecting the home yourself and NOT
judging how well-written the finding is.

Inspector's finding: "${findingText}"

Direction 1 — does the finding hold up? Does this photo plausibly show what
the finding describes? Consider it a match if the photo is consistent with
it, even if not every detail is captured. Consider it a mismatch if the
photo shows something clearly different from, or contradicted by, the
finding (wrong location, wrong object, or the described issue is not
remotely visible).

Direction 2 — does the finding miss anything? Separately, look at the WHOLE
photo for anything else visibly wrong or noteworthy that the finding text
does NOT mention at all. Only report something here if it is clearly
visible — do not invent minor details to fill this list. An empty list is a
correct answer if nothing else stands out.

Respond ONLY with JSON matching this exact shape, no markdown fences, no
extra commentary:

{
  "verdict": "match" | "mismatch",
  "confidence": <number 0 to 1>,
  "reasoning": "<one sentence, max 20 words, plain language>",
  "omissions": [
    { "description": "<plain language, max 15 words>", "severity": "low" | "medium" | "high", "confidence": <0 to 1> }
  ]
}`;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("invalid data URL");
  return { mimeType: match[1], data: match[2] };
}
