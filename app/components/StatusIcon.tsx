import { Circle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { STATUS_LABELS } from "@/app/lib/itemStatus";
import type { ItemStatus } from "@/app/lib/types";

const STATUS_CONFIG: Record<
  ItemStatus,
  { label: string; icon: typeof Circle; className: string; iconClassName: string }
> = {
  unchecked: { label: STATUS_LABELS.unchecked, icon: Circle, className: "text-ink-soft", iconClassName: "" },
  confirmed: { label: STATUS_LABELS.confirmed, icon: CheckCircle2, className: "text-status-confirmed", iconClassName: "fill-status-confirmed-tint" },
  partial: { label: STATUS_LABELS.partial, icon: AlertTriangle, className: "text-status-partial", iconClassName: "fill-status-partial-tint" },
  missing: { label: STATUS_LABELS.missing, icon: XCircle, className: "text-status-missing", iconClassName: "fill-status-missing-tint" },
};

export default function StatusIcon({ status, size = 16 }: { status: ItemStatus; size?: number }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${config.className}`}>
      <Icon size={size} strokeWidth={2} className={config.iconClassName} />
      {config.label}
    </span>
  );
}

export function statusDotClassName(status: ItemStatus) {
  const map: Record<ItemStatus, string> = {
    unchecked: "bg-line",
    confirmed: "bg-status-confirmed",
    partial: "bg-status-partial",
    missing: "bg-status-missing",
  };
  return map[status];
}
