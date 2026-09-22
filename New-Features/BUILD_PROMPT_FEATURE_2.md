# PTP360 Second-Pass QA — Feature 2: Evidence-Consistency Check

Full plan. Read `checklist_confusion_note` at the very bottom first if you're
still fuzzy on how this differs from Feature 1 and Feature 3 — everything
below assumes that distinction is already clear.

---

## 1. Inputs

- **Multiple images per submission, not one.** UI accepts 1–10 files at once
  (drag-drop or multi-select file picker). Built and tested against 5 for
  this round.
- **No checklist item given. No caption given. No location given by the
  user.** That's the whole point of this feature — it's a blind read. The
  model DOES attempt to guess the location itself (see schema, `detected_location`)
  but the user never supplies it.
- Each image is independent — no relationship assumed between images in the
  same batch (they don't have to be the same room, same house, or even
  related to each other).

---

## 2. Processing pipeline

1. User drops N images into the upload zone, clicks "Analyze photos"
2. Client converts each to base64, POSTs the batch to `/api/evidence-check`
3. Server runs **one Gemini call per image**, concurrency capped at 3 at a
   time (a simple queue — don't fire all N simultaneously, free-tier rate
   limits will reject a burst of 5+)
4. Each call is validated against the schema below with `zod`. On a parse
   failure: retry once with a stricter reminder appended to the prompt
   ("Return ONLY valid JSON, no markdown fences, no commentary"). If the
   retry also fails, that image gets `{ error: true }` in its slot — never
   crash the whole batch because one image's response was malformed
5. Server returns the full batch: `{ results: [ { image_id, analysis }, ... ] }`
   in the same order the images were uploaded
6. Nothing is persisted anywhere — the response goes straight back to the
   browser and lives in React state for the rest of the session. This is
   exactly why no database is needed here, including for the PDF export
   (section 5) — the images are already sitting in browser memory as base64
   from the moment they were uploaded, so "give me a PDF" just needs to
   reformat data that's already in hand, not fetch anything from storage.

---

## 3. Structured output schema

**The rule that matters most**: only report a field if it is genuinely
observable. Never fill a field with a guess to make the JSON look complete.
This is enforced in the prompt (section 4) and in how the schema is shaped —
`detected_location` and every field inside a defect signature can be `null`,
and `defect_signatures` can be an empty array. An empty array is a valid,
meaningful result ("nothing concerning was visible"), not a failure.

```ts
type EvidenceCheckResult = {
  image_id: string;              // matches upload order, e.g. "img_1"
  detected_location: string | null;   // model's best guess, e.g. "bathroom"
  location_confidence: number | null; // 0-1, null if detected_location is null

  image_quality: {
    usable: boolean;
    issue: "blurry" | "too_dark" | "obstructed" | null;
  };

  defect_signatures: Array<{
    signature: string;           // e.g. "water staining", "cracked caulking"
    description: string;         // one plain sentence, only what's visible
    severity: "low" | "medium" | "high";
    confidence: number;          // 0-1
    region: string;              // plain language, e.g. "lower left near the base"
    recommended_action: "pass" | "flag_for_review";
  }>;

  overall: {
    risk_score: number;          // 0-100, see scoring formula below
    status: "clean" | "minor_concerns" | "needs_review" | "unusable";
    recommended_action: "pass" | "flag_for_review" | "retake_photo";
    summary: string;             // one sentence, max 20 words
  };
};
```

Notes on the two states people usually forget to design for:
- **`image_quality.usable: false`** (too blurry/dark/obstructed to judge) →
  `defect_signatures` MUST be `[]`, and `overall.status` MUST be `"unusable"`
  with `recommended_action: "retake_photo"`. Never force a clean/needs-review
  verdict out of a photo the model couldn't actually read.
- **`detected_location: null`** is fine and expected sometimes — a close-up
  of a pipe fitting doesn't always tell you which room it's in. Don't treat
  this as an error.

---

## 4. Prompt template

```
You are performing an independent visual review of a single home inspection
photo. You have NOT been told what room this is or what an inspector wrote
about it — judge only what is visible in the image itself.

Rules:
- Only report what you can actually see. If something is not visible or you
  cannot tell, do not guess — use null, or leave defect_signatures empty.
- Do not diagnose the building or claim a hidden defect exists behind a
  surface. Only describe observable evidence: staining, cracking, corrosion,
  visible leaks, missing hardware, wear, damage.
- If the photo is too blurry, dark, or obstructed to evaluate reliably, set
  image_quality.usable to false and say so — do not force an answer.
- detected_location is your best guess of the room/area shown. If you
  genuinely cannot tell, use null rather than guessing.

Respond ONLY with JSON matching this exact shape, no markdown fences, no
extra commentary:

{schema from section 3, inlined here as a literal example}
```

Retry prompt (only sent if the first response fails schema validation):
append `"Your previous response could not be parsed as valid JSON. Return
ONLY the JSON object, nothing else — no explanation, no markdown code
fences."` to the same prompt and resend with the same image.

---

## 5. Scoring system — concrete, production-usable, not abstract

Two layers: a per-defect action rule, and a per-image composite score. Both
are plain deterministic functions over the model's own output — the model
never outputs risk_score or status directly; your code computes them. This
matters for the pitch: it means the scoring logic is auditable and tunable
by Pillar To Post later, not a black box buried inside a prompt.

```js
const SEVERITY_WEIGHT = { low: 8, medium: 20, high: 40 };

// Per-defect: does this single finding deserve a human look on its own?
function defectAction(severity, confidence) {
  if (severity === "high" && confidence >= 0.6) return "flag_for_review";
  if (severity === "medium" && confidence >= 0.75) return "flag_for_review";
  if (severity === "low" && confidence >= 0.9) return "flag_for_review"; // rare but real
  return "pass";
}

// Per-image: composite score across every defect signature found
function scoreImage(defectSignatures) {
  if (defectSignatures.length === 0) {
    return { risk_score: 0, status: "clean", recommended_action: "pass" };
  }

  let score = 0;
  for (const d of defectSignatures) {
    score += (SEVERITY_WEIGHT[d.severity] ?? 0) * d.confidence;
  }
  score = Math.min(100, Math.round(score));

  let status;
  if (score < 15) status = "clean";
  else if (score < 40) status = "minor_concerns";
  else status = "needs_review";

  const recommended_action = defectSignatures.some(
    (d) => defectAction(d.severity, d.confidence) === "flag_for_review"
  ) ? "flag_for_review" : "pass";

  return { risk_score: score, status, recommended_action };
}
```

Why this shape: a single high-severity finding the model is only 40% sure
about contributes just 16 points (40 × 0.4) — not enough alone to trip
`needs_review` (threshold 40). Three separate medium-confidence issues can
add up to a review flag even if no single one would. That's the correct
behavior for a QA layer: isolated uncertain guesses shouldn't tank a photo,
but a pattern of them should. Thresholds (15 / 40, the weight table) are
constants in one place — tune them after the pilot, don't hardcode them
scattered through the codebase.

---

## 6. Report UI and PDF export

**No routing, no browser back button involved** — this is one component with
a local view state: `viewMode: "results" | "report"`. Never rely on browser
history for this.

- **Results view** (default after analysis): grid/list of image cards, each
  a thumbnail + condensed summary (status badge + top defect signature if
  any). A **"See full report"** button at the top switches `viewMode` to
  `"report"`.
- **Report view**: full-width scroll. For each image, in upload order:
  the image itself (larger, ~500px wide) directly above its full write-up —
  every defect signature with severity/confidence/region, then the overall
  score/status/summary. Then the next image below that, same pattern. This
  is the literal "image, then report, then next image" layout you asked for.
  - **"← Back"** button, top-left, explicit UI element, sets `viewMode` back
    to `"results"`. That's the only way back — by design.
  - **"Export as PDF"** button, top-right.

**PDF export — confirmed feasible without a database**, and here's exactly
why your instinct to double-check that was right to raise: the images never
touched a server disk or bucket in the first place — they've been sitting in
the browser as base64 since upload. Exporting just means taking data already
in hand and laying it out as a PDF, nothing to retrieve.

Recommended approach: `POST /api/export-report` with the same
`{ images: [{ base64, analysis }] }` payload already in React state (the
analysis was already computed in step 3 — this call does NOT re-run the
vision model, it only lays out a PDF). Use `@react-pdf/renderer` server-side
(fits naturally in a Next.js/Node stack, lets you define the PDF layout as
React components instead of pulling in a second, unrelated PDF toolchain).
Response is a PDF blob, triggered as a browser download.

---

## 7. The 5 test images — generation prompts

Written for a photorealistic image generator (DALL-E, Midjourney, Stable
Diffusion, whichever you've got). Deliberately mixed: 3 with a visible
defect, 2 clean — so the demo proves the model catches real issues AND
doesn't cry wolf on a fine one, which is the more convincing story for
Furlough than 5-for-5 "found a problem."

**1. Kitchen — under-sink cabinet (defect: water damage)**
> Photorealistic phone-camera photo taken by a home inspector, looking
> straight into an open kitchen cabinet under a sink. Visible: PVC drain
> pipes and a shutoff valve. The cabinet floor and lower side walls show
> clear water-stain discoloration — a dark brownish-yellow ring pattern
> radiating from the base of the pipe, with the particleboard slightly
> swollen and delaminating at the front edge. Slightly cluttered with an
> old cleaning bottle pushed to one side. Direct on-camera flash lighting,
> slightly harsh, realistic phone-photo quality, straight-on angle, no
> artistic framing.

**2. Primary bathroom — tub surround (defect: cracked/missing caulking + mold)**
> Photorealistic phone-camera photo of a bathtub-to-tile corner joint in a
> home. Close-to-medium shot showing the caulking line where the tub meets
> the tile wall. The caulk is visibly cracked, peeling away in a few spots
> with gaps exposing the gap beneath, and there's dark gray-black mold
// mildew discoloration along part of the seam. Tile is otherwise clean
> white ceramic. Natural bathroom lighting, slightly cool color temperature,
> realistic inspection-photo framing, not staged or artistic.

**3. Attic — clean, no defects**
> Photorealistic phone-camera photo taken inside a residential attic space,
> looking across the floor toward the roof rafters. Pink fiberglass batt
> insulation laid evenly between ceiling joists, no visible gaps, staining,
> or compression. Wood rafters and roof sheathing visible above, clean and
> dry with no water stains, no mold, no structural sagging. A ridge vent
> gap is visible at the peak. Single work-light or flash illumination
> typical of attic inspection photos, slightly dusty air, realistic and
> unremarkable — this attic is in good condition.

**4. Electrical panel — open door (defect: corrosion + scorch mark)**
> Photorealistic phone-camera photo of an open residential electrical
> breaker panel, door swung open, breakers visible in two columns. Most
> breakers look normal, but one breaker near the middle-left shows a
> distinct dark brown/black scorch discoloration around its base and the
> bus bar connection, with visible rust-colored corrosion staining on the
> metal panel surface just below it. Everything else in the panel looks
> unremarkable. Direct flash lighting typical of an inspector photographing
> inside a dim garage or utility closet, realistic and slightly grainy.

**5. Roof/gutter section — clean, no defects**
> Photorealistic phone-camera photo taken from a ladder or drone at a
> residential roof edge, showing a section of asphalt shingles meeting a
> aluminum gutter. Shingles lie flat with no curling, cracking, or missing
> tabs. Gutter is clear of debris, properly attached, with no visible rust,
> sagging, or separation from the fascia board. Daylight, slightly overcast
> even lighting, realistic exterior inspection-photo quality, this roof
> section is in good condition.

---

---

## 8. NEW MODE: Room Walkthrough Review (additive — Single Photo mode stays)

### Why this exists

Everything built so far for Feature 2 assumes one clean, close-up,
already-cropped photo of one thing (a water heater, a tub joint). Real
field photos won't look like that — they'll be 3-5 wider shots per room
(one wall each), nothing zoomed in on a specific defect. This mode handles
that reality. It does NOT replace Single Photo mode — the screen gets a
mode toggle: **[ Single Photo | Room Walkthrough ]**, both always available.

### The real design shift, stated plainly

Single Photo mode and Feature 1 both check against something already known
— a fixed defect vocabulary, or `checklist.json`'s fixed item list. Room
Walkthrough does the opposite: the model has to first decide **what's even
worth checking**, from what it sees, before it can check anything. That's a
categorically harder, less constrained task than everything else built so
far, and it carries a real hallucination risk that closed-checklist checking
doesn't — nothing here should be treated as "as reliable as Feature 1" until
it's actually been tested against real photos. Build it, but test it harder
than the other three before trusting it live.

### Inputs

- A **room** selector — reuse `checklist.json`'s location list for the
  dropdown (same vocabulary as the rest of the app), but note the model's
  OUTPUT is not limited to that room's `required_items` — it can surface
  anything it actually sees, checklist or not.
- **2–6 images**, all of the same room, uploaded together (multi-select,
  UI hints "about 4 photos, one per wall/angle" but don't hard-cap at
  exactly 4)

### Processing

**One call, all images for this room together** — this is the correct case
for batching multiple images in a single call (unlike Feature 1's
per-location rule against DIFFERENT locations): the user has explicitly told
you these are all the same room, so there's no cross-location ambiguity to
worry about. Index the images in the prompt (`image_1`, `image_2`, ...) so
the model can cite which image(s) support each thing it reports —
that citation is what keeps this grounded instead of free-associating.

### Prompt template

```
You are reviewing {N} photos of the same room ({room}), taken from different
angles/walls. You have NOT been given a checklist — decide for yourself what
is actually worth checking, based only on what you can see.

Images are provided as image_1 through image_{N}, in that order.

For each image, first note if it is too blurry, dark, or obstructed to
evaluate reliably.

Then identify up to 8 distinct checkable elements visible across these
photos — things like windows, outlets, flooring, fixtures, vents, visible
wall or ceiling condition, doors, built-ins. Only list something you can
actually point to in a specific image. Do not invent items to fill out the
list, and do not repeat the same physical element twice just because it
appears in more than one photo — merge it into one entry citing all the
images it appears in.

For each element: describe its condition in plain language, note any visible
defect signatures with severity and confidence (empty if none), and — only
if genuinely useful and not obvious from the photo alone — note one specific
thing a human inspector should physically check that the photo can't confirm
(e.g. "test this outlet with a plug-in tester", "verify this window latches
and seals properly"). Leave this null if there's nothing non-obvious to add.

Respond ONLY with JSON matching this exact shape, no markdown fences, no
extra commentary:

{
  "room": "{room}",
  "images_analyzed": {N},
  "image_quality": [
    { "image_index": 1, "usable": true, "issue": null }
  ],
  "detected_elements": [
    {
      "element": "<short label, e.g. 'window, left wall'>",
      "category": "<general type, e.g. 'window' | 'outlet' | 'flooring' | 'wall' | 'fixture' | 'vent' | 'door'>",
      "seen_in_images": [1, 3],
      "condition_observed": "<one plain sentence>",
      "defect_signatures": [
        { "signature": "<name>", "severity": "low" | "medium" | "high", "confidence": <0-1> }
      ],
      "recommended_check": "<one sentence, or null>",
      "confidence": <0-1>
    }
  ],
  "overall_summary": "<one sentence, max 20 words>"
}
```

Retry rule: identical to Single Photo mode — one retry with a stricter
"return ONLY the JSON object" reminder on schema-validation failure; surface
`{ error: true }` with a manual retry button if that also fails.

### Why the 8-element cap and the citation requirement both matter

Without a cap, an open-ended "find everything checkable" prompt can sprawl —
more elements isn't more value if half of them are marginal. Without
requiring `seen_in_images` on every element, there's no way to verify the
model isn't describing something it inferred rather than actually saw.
Both constraints exist specifically to keep this mode auditable despite
being fundamentally less constrained than the rest of the app.

### UI

Same results → report → export pattern as Single Photo mode, adapted:
- **Results view**: cards, one per detected element — label, category tag,
  condition sentence, defect badges if any, `recommended_check` shown as a
  small note only when present, small thumbnail(s) for its `seen_in_images`
  — reuse the thumbnail-click-to-enlarge behavior already built.
- **"See full report"** → same `viewMode` toggle pattern as Single Photo
  mode: the room's images at the top, then each detected element written
  out below, same "image then write-up" layout already established.
- **"Export as PDF"** → same `/api/export-report` mechanism already built for
  Single Photo mode — this data is a different shape but the same principle
  (nothing persisted, already-computed data reformatted on demand). Extend
  the existing export route to handle either payload shape rather than
  building a second export endpoint.
- **"← Back"** → same explicit in-app button, not browser history, same as
  everywhere else in this app.

This satisfies both things asked for — downloadable AND visible on screen —
by reusing the mechanism that already exists for Single Photo mode instead
of building a parallel one.

---

## `checklist_confusion_note`

If you're still mixing up F1/F2/F3: F1 checks "was the required thing tagged
AND is it visible" (checklist-driven). F2 (this document) checks "what does
the model see with zero hints" (blind, no checklist, no caption — the
capability proof). F3 checks "does the model agree with what the human
already wrote" (paired, the actual production QA mechanism). Same two raw
ingredients (photo, sometimes text) across all three — different question
asked of them each time.
