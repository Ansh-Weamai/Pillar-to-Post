import type { DefectSeverity } from "@/app/lib/types";

// Single source of truth for how defect severity reads everywhere it shows
// up (Single Photo results/report, Room Walkthrough results/report) — same
// stoplight treatment as item status: low reads as the "minor" green tier,
// medium as the amber "worth a look" tier, high as the red "needs attention"
// tier.
export const SEVERITY_STYLE: Record<DefectSeverity, string> = {
  low: "bg-status-confirmed-tint text-status-confirmed",
  medium: "bg-status-partial-tint text-status-partial",
  high: "bg-status-missing-tint text-status-missing",
};

export const SEVERITY_LABEL: Record<DefectSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
