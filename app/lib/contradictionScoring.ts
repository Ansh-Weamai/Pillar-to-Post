import type { DefectAction, Omission } from "@/app/lib/types";

// Deterministic, over the model's own verdict/confidence/omissions — the
// model never outputs recommended_action directly, same principle as
// Features 1 and 2 keeping scoring logic in code, not the prompt.
export function contradictionAction(
  verdict: "match" | "mismatch",
  confidence: number,
  omissions: Omission[]
): DefectAction {
  if (verdict === "mismatch") return "flag_for_review";

  // A "match" the model isn't confident about is NOT a clean pass —
  // an uncertain agreement still deserves a human glance.
  if (confidence < 0.6) return "flag_for_review";

  // Even a confident, correct match can still be incomplete. A significant
  // omission overrides an otherwise clean verdict.
  const hasSignificantOmission = omissions.some(
    (o) => (o.severity === "high" && o.confidence >= 0.6) || (o.severity === "medium" && o.confidence >= 0.75)
  );
  if (hasSignificantOmission) return "flag_for_review";

  return "pass";
}
