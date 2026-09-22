# PTP360 Second-Pass QA — Build Prompt REVISION 2

This SUPERSEDES sections 1 and 3 of `BUILD_PROMPT.md`. Keep section 2 (the
3-tab structure) as-is. Everything below is what changes and why — the first
pass worked functionally but looked and behaved like a raw data dump, not a
tool. Read "What was wrong" first so you don't repeat it in the other two tabs
later.

## What was wrong with v1 (don't repeat this)

- A single flat `<table>` with default-ish row styling — no cards, no
  shadows, no grouping, no icons. Reads as a spreadsheet, not a product.
- Tiny (48px) blurry thumbnails with no way to view them larger.
- The page loaded already showing 6 rows of solid red "Missing" before the
  user did anything — visually alarming and, worse, dishonest-feeling, since
  nothing had actually been checked yet against real evidence the user
  provided in that session.
- The ONLY way to see any result was clicking one "Run check" button that
  replayed the same 3 hardcoded images every time. Not a tool — a fixed replay.

Root cause: "keep it minimal" was interpreted as "render as little as
possible," when it should mean "no unnecessary copy, but real visual
structure." Minimal text ≠ minimal design.

---

## 1. New layout: sidebar checklist + room cards

```
┌─────────────────┬──────────────────────────────────────┐
│  CHECKLIST       │   [Upload report]  [Load demo data]   │
│  (sticky, 280px) │                                        │
│                   │   ┌─ Garage ──────────────────────┐  │
│  ▾ Garage         │   │  ○ water heater      [+ Add]   │  │
│    ○ water heater │   │  ○ electrical panel            │  │
│    ○ electrical.. │   │  [thumbnail] [thumbnail]        │  │
│  ▾ Attic          │   └─────────────────────────────────┘ │
│    ○ insulation   │                                        │
│    ○ ventilation  │   ┌─ Attic ────────────────────────┐  │
│  ▾ Crawlspace      │   │  ...same card shape...          │  │
│    ...             │   └─────────────────────────────────┘ │
│  ▾ Roof            │                                        │
│  ▾ Front porch      │        (one card per room, scrollable)│
│  ▾ Deck             │                                        │
└─────────────────┴──────────────────────────────────────┘
```

- **Left sidebar**: every room from `checklist.json`, always expanded (no
  accordion needed — there are only 6 rooms), each required item shown as a
  small row with a status dot. Clicking a room label scrolls the main panel
  to that room's card (`scrollIntoView`, smooth). This is the "detailed
  checklist" you asked for — it's visible at all times, not buried in a table.
- **Main panel**: one card per room, in the same order as the sidebar.
- Sidebar status dot and the card's item status must always be in sync —
  same source of state, rendered twice, never two separate copies of truth.

### Status icon system (replaces plain color-text badges)

Use `lucide-react`. Icon + label together, always — never color alone:

| Status | Icon | Color | Label |
|---|---|---|---|
| Not yet checked (default, before any evidence) | `Circle` (outline only) | `--ink-soft` (gray, NOT red) | "Awaiting evidence" |
| Confirmed | `CheckCircle2` (filled) | `--status-confirmed` | "Confirmed" |
| Tagged, not visible | `AlertTriangle` (filled) | `--status-partial` | "Not visible" |
| Checked, missing entirely | `XCircle` (filled) | `--status-missing` | "Missing" |

**This is the key fix for the red-wall problem**: a room with no evidence
uploaded yet is NOT "Missing" (red) — it's "Awaiting evidence" (neutral gray
outline). `Missing` is reserved for rooms where the user explicitly ran a
check (via "Load demo data" or finished a report upload) and the result came
back genuinely absent. Nothing turns red on page load, ever.

### Room card anatomy

```css
.room-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  margin-bottom: 16px;
}
```

- Header row: room name (bold, 16px) + a small summary chip on the right
  ("2/2 confirmed", "1 missing" — whichever is worst, in that status's color)
- Below: one row per required item — icon + label + confidence % (only once
  checked) on the right
- Below that: a horizontal thumbnail strip (each thumbnail 64×64px, rounded
  6px, clickable to open larger in a simple lightbox — a plain `<dialog>` or
  a fixed-position overlay is enough, don't reach for a library)
- Bottom-right of the card: an **"+ Add photo"** button (see section 2)

---

## 2. Photo upload — per room, multiple files, replaces hardcoded-only flow

Add a file input (styled as the "+ Add photo" button) on every room card.
`accept="image/*"` `multiple`. This is additive to the sample images, not a
replacement mechanism — a room can end up with photos from the demo dataset
AND ones the user drops in live.

**New API route**: `POST /api/check-room`

Request: `{ location: string, images: string[] (base64) }` — one or more
images for one room.

Behavior: same Pass B logic as before (one Gemini call, this time with
potentially several images attached to a single call since they all belong
to the same room being evaluated together — this is the one place batching
multiple images in one call is correct, because unlike the cross-room case,
there's no location ambiguity: all images in this call are already known to
be this one room). Prompt addition: "These images are ALL from the same
location. An item counts as visible if it appears in ANY of them." Response
shape unchanged from the original per-item JSON contract.

On response: update just that room's card + its sidebar rows. Don't
re-render the whole page — this should feel incremental, like the tool is
actually working on what you just gave it.

Client-side: while a room's check is in flight, that room's card items show
a small inline spinner next to the icon position, not a full-page loader —
other rooms stay interactive.

---

## 3. Upload an existing report — new top-level flow

Button in the header, next to "Load demo data": **"Upload report"**. Opens a
simple modal: a dropzone + file picker, `accept=".pdf,image/*"`, single file.

**New API route**: `POST /api/upload-report`

- If a PDF: send it to Gemini directly as a document input in one call (the
  Gemini API accepts PDF files natively as multimodal input — don't build a
  page-splitting pipeline for this prototype, `[OPEN]` only if the specific
  test PDF is too large for one call, which is unlikely for a single-property
  report).
- If an image: treat it as a single-page report, same call shape.

**Prompt**:

```
You are looking at a home inspection report. Here is the full checklist of
locations and required items we expect to see documented:

{checklist.json, inlined as readable text}

Go through the document and determine, for EACH location above:
1. Is this location discussed or photographed anywhere in the document?
2. For each required item under that location, is it visibly documented?
3. If documented, what condition does the report state or imply for it —
   "Satisfactory" (no issue reported), "Needs Repair" (a defect, damage, or
   repair recommendation is stated), or "Limitation" (the report explicitly
   says the item couldn't be fully evaluated)? If not documented at all,
   condition is null — there is nothing to rate.

Respond ONLY with JSON:
{
  "results": [
    {
      "location": "...",
      "required_item": "...",
      "documented": true|false,
      "confidence": 0-1,
      "condition": "Satisfactory" | "Needs Repair" | "Limitation" | null
    }
  ]
}

Cover every location and every required item from the checklist above, even
ones the document never mentions (documented: false, condition: null for
those).
```

This is deliberately a basic, three-value condition read — not the richer
multi-signature defect schema Features 2 and 3 use. The point here is only
to answer "does this confirmed item also need attention," cheaply, in the
same single pass as the coverage check itself. If Furlough wants defect-level
detail on a specific finding, that's what Features 2 and 3 are for — don't
over-build this into a fourth defect-detection engine.

- Merge this response into the SAME room cards and sidebar as the photo-upload
  flow — same status icons, same everything. The user should not be able to
  tell, just by looking at the result, whether a room's status came from a
  demo image, a live photo upload, or a parsed report. One system, three ways
  to feed it.
- **Display rule**: a `documented: true` row still shows its existing
  coverage badge (Confirmed / Not visible), but when `condition` is
  `"Needs Repair"` or `"Limitation"`, add a second, small qualifier badge
  next to it — e.g. "Confirmed · Needs Repair" — in the same red/amber used
  everywhere else in the app. Do NOT add a visible qualifier for
  `"Satisfactory"` rows; showing "Confirmed · Satisfactory" on every single
  passing row is noise the "not much text" design principle explicitly rules
  out. Silence means satisfactory.
- This upload does not need a thumbnail per item (no per-item photo exists
  from a PDF page) — show a small "from uploaded report" tag instead of a
  thumbnail on those rows.

---

## 4. "Load demo data" — the old flow, demoted to a convenience button

Keep the original 3-image sample-tour behavior, but it's no longer automatic
or the main path. Rename the old "Run check" button to **"Load demo data"**,
move it to the header (next to "Upload report"), same green solid style.
Clicking it populates rooms exactly as v1 did — this stays as a fast fallback
if the live upload demo has a hiccup on the call, not the primary flow.

---

## 5. Updated acceptance checklist (replaces the v1 one)

- [ ] Sidebar checklist visible at all times, all 6 rooms, correct required
      items per room, status dots in sync with the main cards
- [ ] Default state on load: every item shows the gray "Awaiting evidence"
      icon — NOT red, NOT any color, until something is actually checked
- [ ] Room cards have visible borders/shadow/spacing — this should look like
      a real product screen in a screenshot, not a table
- [ ] "+ Add photo" on a room card accepts multiple images, runs the check,
      updates only that room without a full page reload/re-render
- [ ] "Upload report" accepts a PDF, runs the whole-document check, merges
      into the same cards
- [ ] "Load demo data" still works and produces the same 3-state mix as
      before (missing / partial / confirmed), as a fallback path
- [ ] Thumbnails are clickable and open larger — no dead-end tiny images
- [ ] Confidence only ever shown next to an actually-checked item, never a
      placeholder or "0%"
