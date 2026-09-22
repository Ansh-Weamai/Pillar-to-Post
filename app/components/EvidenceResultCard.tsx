import { ImageOff } from "lucide-react";
import EvidenceStatusBadge from "@/app/components/EvidenceStatusBadge";
import { topDefect } from "@/app/lib/evidenceUi";
import { SEVERITY_LABEL, SEVERITY_STYLE } from "@/app/lib/severityStyle";
import type { EvidenceCheckItem } from "@/app/lib/types";

export default function EvidenceResultCard({
  dataUrl,
  item,
  onOpenLightbox,
}: {
  dataUrl: string;
  item: EvidenceCheckItem;
  onOpenLightbox: (url: string) => void;
}) {
  const top = item.error ? null : topDefect(item.analysis.defect_signatures);

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-paper shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={item.error ? "Evidence photo" : item.analysis.detected_location ?? "Evidence photo"}
        onClick={() => onOpenLightbox(dataUrl)}
        className="h-40 w-full cursor-pointer object-cover"
      />
      <div className="flex flex-col gap-2 p-3">
        {item.error ? (
          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-status-missing-tint px-2.5 py-1 text-[12px] font-bold text-status-missing">
            <ImageOff size={14} /> Couldn&apos;t analyze
          </span>
        ) : (
          <>
            <EvidenceStatusBadge status={item.analysis.overall.status} />
            <p className="text-[12px] capitalize text-ink-soft">
              {item.analysis.detected_location ?? "Location unclear"}
            </p>
            {top ? (
              <p className="flex items-center gap-1.5 text-[13px] capitalize text-ink">
                {top.signature}
                <span
                  className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold normal-case ${SEVERITY_STYLE[top.severity]}`}
                >
                  {SEVERITY_LABEL[top.severity]}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-ink-soft">No concerns visible</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
