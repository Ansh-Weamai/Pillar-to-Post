# PTP360 Second-Pass QA — Build Prompt (Design + Feature 1)

Paste this whole document to your coding agent (Claude Code or similar). It has
every decision already made — stack, colors, data, logic. Don't re-derive
anything; implement it as written. Where a judgment call is genuinely open,
it's marked `[OPEN]` — everything else is final.

Stack context (already decided, don't revisit): Next.js (App Router) + React,
API routes for backend, `@google/genai` for the vision model, `GEMINI_API_KEY`
env var, no database, no blob storage — see `requirements.txt` and
`.env.example` already in this repo's root for the full reasoning.

---

## 1. Design system

**Tone: minimal. Almost no copy.** Status is carried by color + a short label
(1–2 words) + an icon. No paragraphs anywhere in the product UI. No
onboarding text, no empty-state essays, no tooltips explaining what a badge
means — the badge IS the explanation.

### Colors

Sampled directly from Pillar To Post's own material, then deepened for
contrast (their originals are softer/pastel — we want this to read punchy on
a screen-share, not muted):

```css
:root {
  /* Brand green — sampled ~#5A942A off their own graphic, deepened */
  --ptp-green: #3E7A1C;        /* primary actions, "confirmed" state */
  --ptp-green-strong: #2E5E12; /* hover/active state of the above */
  --ptp-green-tint: #E7F1DC;   /* light backgrounds behind green badges */

  /* Ink — true near-black, not their softer off-black, for max contrast */
  --ink: #0A0A0A;
  --ink-soft: #4B4B4B;         /* secondary text only — use sparingly */

  /* Canvas */
  --paper: #FFFFFF;
  --paper-warm: #FAFAF7;       /* subtle section backgrounds only */
  --line: #E4E4E1;             /* hairline borders/dividers */

  /* Status colors — NOT in PTP's original palette, added for the 3-state
     table. Chosen to be unambiguous and high-contrast against white. */
  --status-missing: #C6221B;       /* not tagged at all */
  --status-missing-tint: #FBE6E4;
  --status-partial: #C97A0A;       /* tagged, but item not visible */
  --status-partial-tint: #FBEDDA;
  --status-confirmed: var(--ptp-green);   /* tagged + confirmed visible */
  --status-confirmed-tint: var(--ptp-green-tint);
}
```

Dark mode: not required for the prototype. `[OPEN]` — skip unless you have
spare time; this will be demoed live on one screen, not browsed asynchronously.

### Typography

- One typeface, system font stack is fine: `-apple-system, "Inter", "Segoe UI", sans-serif`
- Two sizes for almost everything: 14px body / 20px headers. A 12px caption
  size is fine for the confidence % under a badge. Nothing bigger than 24px
  anywhere — this is a tool, not a landing page.
- Bold is the ONLY emphasis mechanism. No italics, no underlines except links.

### Layout

- Single-column, max-width ~960px, centered, generous whitespace (32px+
  section gaps). This is a demo on a shared screen — it should read clearly
  from across a video call, not be dense.
- Tab bar at the very top: three tabs, equal width, underline-style active
  indicator in `--ptp-green`. See section 2.
- No sidebar, no nav menu, no logo header beyond a small text label
  "PTP360 · Second-Pass QA" top-left, 14px, `--ink-soft`.

### Components

- **Status badge**: a filled rounded-rect chip, tint background + solid text
  in the matching status color, one word: `Missing` / `Not visible` /
  `Confirmed`. No border. 8px vertical padding, 12px horizontal, 6px radius.
- **Table row**: location name (bold, `--ink`) · required item (regular,
  `--ink-soft`) · thumbnail (48×48px, rounded 4px, only if a photo exists for
  that row) · status badge · confidence (small, `--ink-soft`, only on
  vision-checked rows, format `92%`).
- **Run button**: solid `--ptp-green` background, white text, 6px radius, no
  icon needed, label is just "Run check". Becomes `--ptp-green-strong` on
  hover, disabled/greyed while a check is in flight.

---

## 2. App structure — 3 tabs, 1 built

```
/                    -> redirects to /coverage
/coverage            -> Feature 1, fully functional (this build)
/evidence-check       -> placeholder, see below
/contradiction-check  -> placeholder, see below
```

Tab bar shows all three at all times, in this order: **Coverage Check**,
**Evidence Consistency**, **Contradiction Flag**. The two placeholder tabs are
real, clickable, navigable routes — not disabled/greyed tabs — because this UI
IS the pitch artifact; Furlough/Dewar need to see the shape of the full
roadmap, not just tab 1.

Placeholder tab content (both `/evidence-check` and `/contradiction-check`):
centered, minimal — feature name as a 20px header, one line under it in
`--ink-soft`, nothing else:

- Evidence Consistency: *"Checks a single photo against what the model can
  see, no caption needed. Next up."*
- Contradiction Flag: *"Checks a photo against the inspector's written
  finding for agreement. Next up."*

No progress bars, no "coming soon" badges, no roadmap timeline graphics. One
sentence each. That's the whole placeholder.

---

## 3. Feature 1 — Coverage check, full implementation

### 3.1 Data model

`/data/checklist.json` — static config, checked into the repo, not editable
at runtime:

```json
[
  { "location": "garage",       "required_items": ["water heater", "electrical panel"] },
  { "location": "attic",        "required_items": ["insulation", "ventilation"] },
  { "location": "crawlspace",   "required_items": ["foundation", "moisture signs"] },
  { "location": "roof",         "required_items": ["shingles", "flashing"] },
  { "location": "front porch",  "required_items": ["entry door", "railing"] },
  { "location": "deck",         "required_items": ["railing", "decking boards"] }
]
```

`/data/sample-tour.json` — represents ONE demo inspection tour: which
locations the (fictional) inspector actually tagged, and the photo(s)
attached to each. This is the stand-in for what would, in a real deployment,
come from PTP360/OnePoint's own tour data.

```json
[
  { "location": "garage",      "photos": ["/sample-images/garage-water-heater.png"] },
  { "location": "front porch", "photos": ["/sample-images/front-porch.png"] },
  { "location": "deck",        "photos": ["/sample-images/deck.png"] }
]
```

Note deliberately: **attic, crawlspace, and roof are NOT in `sample-tour.json`
at all.** That's not an oversight — it's what makes Pass A produce real
"Missing" rows without any vision call. And `garage`'s only photo is a water
heater shot with no electrical panel in frame — that's also deliberate, so
Pass B produces one honest "Not visible" row instead of everything coming
back green, which would be a weaker, less credible demo.

The 3 images referenced above are already staged in this repo's
`/sample-images/` folder (real screenshots from the client's own PTP360
product, not synthetic). Copy them into `public/sample-images/` at that exact
path. Two of them (`front-porch.png`, `deck.png`) are tour-navigation
screenshots with some PTP360 UI chrome visible (sidebar, floor plan overlay)
rather than clean cropped photos — that's a known limitation of the demo
dataset, not a bug. Don't try to crop or clean them; the underlying room
content is still clearly visible and that's what the vision model needs.

### 3.2 Pass A — metadata check (no AI call)

For every `{location, required_items}` entry in `checklist.json`:

- If `location` does NOT appear in `sample-tour.json` → every one of its
  `required_items` gets status `missing`. Skip Pass B entirely for this
  location — there's no photo to check.
- If `location` DOES appear → its `required_items` proceed to Pass B.

This is pure array/set comparison over the two JSON files. Zero API calls,
runs instantly, is the first thing that should render (Pass B rows can show a
lightweight loading state while their vision calls are in flight).

### 3.3 Pass B — vision check (one call per image)

For each tagged location, make **one Gemini call per photo** (not per
required item — ask about all of that location's required items in the same
call, since they all refer to the same image; the "one call per photo" rule
from our planning doc is about never mixing multiple different photos into
one call, not about asking one question at a time).

**Prompt template** (fill in `{location}` and `{required_items}`):

```
You are doing a second-pass quality check on a home inspection photo. You are
NOT diagnosing the property — you are only checking whether specific items
are visibly present in this photo.

Location tagged for this photo: {location}
Items to check for: {required_items joined by ", "}

For EACH item, decide if it is visibly identifiable in the photo. Respond
ONLY with JSON matching this exact shape, one object per item, no other text:

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

If the photo shows visible UI chrome (a sidebar, a floor plan overlay, a
comments panel) around the actual room content, ignore the chrome and judge
only the photographed scene itself.
```

Send the image as inline base64 alongside this prompt in a single
`generateContent` call. Use `zod` to validate the returned JSON matches the
shape above before using it — if parsing fails, treat that item as
`{ visible: false, confidence: 0, reasoning: "model response unparseable" }`
rather than crashing the row.

Model: `gemini-3-flash-preview` (see `.env.example` — this is the stronger
model, worth using here since defect/item visibility judgment is the kind of
nuance flash-lite is more likely to get wrong).

### 3.4 Merge into the final 3-state table

One row per `{location, required_item}` pair from `checklist.json`, always,
regardless of tagged status:

| Pass A result | Pass B result | Final status |
|---|---|---|
| location not tagged | (skipped) | `missing` |
| location tagged | `visible: true` | `confirmed` |
| location tagged | `visible: false` | `partial` |

Table columns, in order: Location, Required item, Thumbnail (if a photo
exists for that row), Status badge, Confidence (only on `confirmed`/`partial`
rows — `missing` rows show no confidence, there was nothing to check).

### 3.5 API route

`POST /api/coverage-check` — no request body needed for the demo (it always
runs against the one bundled `sample-tour.json`). Runs Pass A synchronously,
kicks off Pass B calls (can run in parallel — one Gemini call per unique
photo, so at most 3 concurrent calls for this demo dataset), merges, returns
the full table as JSON:

```json
{
  "rows": [
    { "location": "garage", "required_item": "water heater", "status": "confirmed", "confidence": 0.94, "thumbnail": "/sample-images/garage-water-heater.png" },
    { "location": "garage", "required_item": "electrical panel", "status": "partial", "confidence": 0.88, "thumbnail": "/sample-images/garage-water-heater.png" },
    { "location": "attic", "required_item": "insulation", "status": "missing" },
    ...
  ]
}
```

### 3.6 UI behavior

- Page loads with an empty state: just the "Run check" button, centered,
  nothing else on screen. No pre-loaded table.
- Click → button shows a disabled/loading state (label changes to "Checking…"
  — that's the ONE piece of loading copy allowed) → table fades in row by
  row as results arrive, or all at once if that's simpler to build — either
  is fine, `[OPEN]`, prioritize working over animated.
- Sort order: `missing` rows first, then `partial`, then `confirmed` — the
  point of the demo is that the problems surface immediately, not buried at
  the bottom of an all-green table.

---

## 4. Acceptance checklist

- [ ] Tab bar with all 3 tabs visible and navigable; only Coverage Check has
      real functionality
- [ ] `checklist.json` and `sample-tour.json` exist exactly as specified
- [ ] 3 real images copied into `public/sample-images/` at the exact paths used
- [ ] Pass A produces `missing` for attic, crawlspace, roof with zero API calls
- [ ] Pass B produces at least one `partial` result (garage / electrical panel)
- [ ] Final table shows all 3 status colors on one screen without scrolling,
      on a normal laptop viewport
- [ ] No paragraph of UI copy anywhere longer than one short sentence
- [ ] Colors match section 1 exactly — no default Tailwind blue/gray sneaking
      into buttons, links, or focus rings
