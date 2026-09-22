import type { DefectAction, DefectSeverity } from "@/app/lib/types";

// Deterministic scoring over the model's own output — the model never outputs
// risk_score/status/recommended_action directly, so this logic stays auditable
// and tunable in one place instead of buried inside a prompt.
export const SEVERITY_WEIGHT: Record<DefectSeverity, number> = { low: 8, medium: 20, high: 40 };

// Per-defect: does this single finding deserve a human look on its own?
export function defectAction(severity: DefectSeverity, confidence: number): DefectAction {
  if (severity === "high" && confidence >= 0.6) return "flag_for_review";
  if (severity === "medium" && confidence >= 0.75) return "flag_for_review";
  if (severity === "low" && confidence >= 0.9) return "flag_for_review"; // rare but real
  return "pass";
}

// Per-image: composite score across every defect signature found
export function scoreImage(defectSignatures: Array<{ severity: DefectSeverity; confidence: number }>): {
  risk_score: number;
  status: "clean" | "minor_concerns" | "needs_review";
  recommended_action: DefectAction;
} {
  if (defectSignatures.length === 0) {
    return { risk_score: 0, status: "clean", recommended_action: "pass" };
  }

  let score = 0;
  for (const d of defectSignatures) {
    score += (SEVERITY_WEIGHT[d.severity] ?? 0) * d.confidence;
  }
  score = Math.min(100, Math.round(score));

  let status: "clean" | "minor_concerns" | "needs_review";
  if (score < 15) status = "clean";
  else if (score < 40) status = "minor_concerns";
  else status = "needs_review";

  const recommended_action: DefectAction = defectSignatures.some(
    (d) => defectAction(d.severity, d.confidence) === "flag_for_review"
  )
    ? "flag_for_review"
    : "pass";

  return { risk_score: score, status, recommended_action };
}
