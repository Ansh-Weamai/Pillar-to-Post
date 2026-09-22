import { CheckCircle2, AlertTriangle, XCircle, ImageOff } from "lucide-react";
import type { EvidenceCheckResult } from "@/app/lib/types";

const STATUS_CONFIG: Record<
  EvidenceCheckResult["overall"]["status"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  clean: { label: "Clean", icon: CheckCircle2, className: "bg-status-confirmed-tint text-status-confirmed" },
  minor_concerns: { label: "Minor concerns", icon: AlertTriangle, className: "bg-status-partial-tint text-status-partial" },
  needs_review: { label: "Needs review", icon: XCircle, className: "bg-status-missing-tint text-status-missing" },
  unusable: { label: "Unusable", icon: ImageOff, className: "bg-paper-warm text-ink-soft" },
};

export default function EvidenceStatusBadge({ status }: { status: EvidenceCheckResult["overall"]["status"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2.5 py-1 text-[12px] font-bold ${config.className}`}>
      <Icon size={14} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}
