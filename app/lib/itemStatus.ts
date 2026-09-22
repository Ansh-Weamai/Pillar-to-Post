import type { ItemStatus } from "@/app/lib/types";

// Single source of truth for how each status reads to a human — the
// Coverage Check badges (StatusIcon) and the gap-report PDF both import
// this instead of keeping their own copy of the wording.
export const STATUS_LABELS: Record<ItemStatus, string> = {
  unchecked: "Awaiting evidence",
  confirmed: "Confirmed",
  partial: "Not visible",
  missing: "Missing",
};
