import { SEVERITY_WEIGHT } from "@/app/lib/evidenceScoring";
import type { DefectSignature } from "@/app/lib/types";

// The single defect signature that contributes most to an image's risk score
// — used for the condensed card summary in the results grid.
export function topDefect(signatures: DefectSignature[]): DefectSignature | null {
  if (signatures.length === 0) return null;
  return [...signatures].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] * b.confidence - SEVERITY_WEIGHT[a.severity] * a.confidence
  )[0];
}
