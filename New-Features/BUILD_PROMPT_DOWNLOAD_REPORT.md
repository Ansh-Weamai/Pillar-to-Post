# PTP360 Second-Pass QA — Download Report (gap-checklist export)

Addendum to Feature 1 / Coverage Check. Adds a third header button:
**Upload report | Load demo data | Download report** (new, right-aligned).

---

## 0. Read this first — bind to what already exists, do not hardcode

This is an ADDITION to a codebase that already exists, not a fresh build.
Before writing any code:

1. **Find the real checklist source.** Wherever `checklist.json` (or whatever
   it's since been renamed to) is currently loaded in the app — import and
   read it the same way. Do not write out a list of category or item names
   anywhere in this feature's code. If a category or item is later added,
   removed, or renamed in that source file, this feature must reflect that
   automatically with zero code changes here.
2. **Find the real results state shape.** Locate wherever the Coverage
   Check tab currently holds its live results (whatever hook, context, or
   component state that is) and use its ACTUAL field names and types. The
   field names used as examples in this doc — `location`, `required_item`,
   `status`, `confidence` — are illustrative only. If the real code calls
   them something else, or nests them differently, use the real shape. Do
   not introduce a second, parallel shape for this feature to consume.
3. **Find the real status vocabulary.** Reuse the exact status
   type/enum/constants already defined for Coverage Check (whatever produces
   the on-screen "Confirmed" / "Not visible" / "Missing" / "Awaiting
   evidence" badges). Do not redefine your own copy of these strings in the
   export code — import the same source of truth. Two copies of the same
   vocabulary is how they silently drift apart later.
4. **No counts, no category names, no item names literally written in this
   feature's code, anywhere** — not as defaults, not as fallbacks, not as
   examples left in "temporarily." Every category/item/count that appears in
   an exported report must trace back to `checklist.json` and the live
   results state at the moment of export, not to a value typed into this
   feature's source.

If any of steps 1–3 turn up something ambiguous or inconsistent with what
this doc assumes, stop and flag it rather than guessing a shape and building
against that guess.

---

## 1. What this actually is

This exports whatever is CURRENTLY on screen in the Coverage Check tab —
regardless of how it got there (Upload report, Load demo data, or manual
per-room photo uploads from Revision 2) — as a downloadable PDF. It does not
run any new check. It is a formatting step over results that already exist
in React state.

**Confirms directly what was asked**: no API key needed, no database needed.
The checklist results are already sitting in the browser from whatever check
already ran — this button reads that same state and lays it out as a
document. Nothing is re-fetched, nothing is re-analyzed.

---

## 2. Content: two lists, not one — gaps AND flagged findings

The original ask was "items missing in each category" — that's still here,
but Coverage Check now also carries a `condition` field on documented items
(Satisfactory / Needs Repair / Limitation — see the report-upload update in
`BUILD_PROMPT_REVISION_2.md` section 3). A confirmed item that needs repair
is at least as actionable as a missing one, arguably more — so the export
now leads with both, as two clearly separate sections:

- **Section 1 — Needs Attention** (documented but `condition` is
  `"Needs Repair"` or `"Limitation"`): these are real findings, not gaps.
  Group by category, show the item and its condition.
- **Section 2 — Not Documented** (the original scope: `missing` / `partial`
  / `awaiting evidence`): the coverage gaps, same as before.
- Fully `Satisfactory` items are skipped in both sections, same as before —
  this document is a punch list, not a full reprint.
- **Header summary** now reports three numbers, not two: confirmed-clean,
  confirmed-needs-attention, and not-documented — so the header line alone
  tells you whether the outstanding work is "go find missing evidence" or
  "go fix something," which are very different asks for whoever reads this
  report next.

Example structure:

```
PTP360 Second-Pass QA — Gap & Findings Report
Generated from: [Upload report | Load demo data | Manual uploads]
62 confirmed clean · 11 need attention · 5 not documented

NEEDS ATTENTION
Electrical System
  ⚠ main panel & breakers — Needs Repair
Garage
  ⚠ water heater — Needs Repair

NOT DOCUMENTED
Laundry Room
  ○ washer / dryer connections — awaiting evidence
  ○ dryer vent — awaiting evidence
  ○ plumbing supply & drain — awaiting evidence
```

---

## 3. Implementation

`POST /api/export-gap-report` — stateless, same pattern as Feature 2's PDF
export. Request body: the current results array already held in the Coverage
Check page's state (location, required_item, status, confidence per row —
exactly what's already rendered on screen). Response: a PDF, built with
`@react-pdf/renderer` (same library Feature 2 already uses — don't introduce
a second PDF toolchain for this).

If you'd rather skip the backend round-trip entirely, generating this
client-side with a lightweight library is equally valid here since the
content is plain text/lists with no images — there's less reason to prefer
the server route here than there was for Feature 2, where the images
themselves made server-side layout worth it. Either is fine; pick whichever
is less code given what's already built.

---

## 4. Button behavior

- **Disabled/hidden** until at least one check has actually run (empty state
  before any Upload report / Load demo data / manual upload) — nothing to
  export yet, don't show a button that produces a blank document.
- Once results exist, it's always available, and always reflects the LATEST
  state — if the user uploads more photos after their first check, re-running
  the export should reflect the updated statuses, not a stale snapshot from
  the first run.

---

## 5. Acceptance checklist

- [ ] Button only appears/enables after a real result set exists
- [ ] Exported content has two clearly separate sections — "Needs Attention"
      (documented + condition is Needs Repair/Limitation) and "Not
      Documented" (missing/partial/awaiting) — never merged into one list
- [ ] Header line reports all three counts: confirmed-clean,
      needs-attention, and not-documented
- [ ] A fully Satisfactory, fully documented item never appears in either
      section
- [ ] Header line states the total confirmed/outstanding count
- [ ] Re-running the export after new uploads reflects updated state, not a
      cached first result
- [ ] No new vision-model call happens anywhere in this flow — confirm by
      checking that `/api/export-gap-report` never imports or calls the
      Gemini client
- [ ] Search this feature's new code for any literal category or item name
      (e.g. "Attic", "water heater") — there should be none. Everything
      renders from `checklist.json` and the live results state
- [ ] Temporarily add or rename a category/item in `checklist.json` and
      confirm the exported report reflects that change with no code edits
      to the export feature itself — this is the real test of "no
      hardcoding," not just a code read-through
