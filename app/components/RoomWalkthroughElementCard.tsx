import { Info } from "lucide-react";
import type { RoomWalkthroughElement } from "@/app/lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  low: "bg-status-partial-tint text-status-partial",
  medium: "bg-status-partial-tint text-status-partial",
  high: "bg-status-missing-tint text-status-missing",
};

export default function RoomWalkthroughElementCard({
  element,
  thumbnails,
  onOpenLightbox,
}: {
  element: RoomWalkthroughElement;
  thumbnails: string[];
  onOpenLightbox: (url: string) => void;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-paper p-4 shadow-sm">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold capitalize text-ink">{element.element}</h3>
        <span className="whitespace-nowrap rounded-[4px] bg-paper-warm px-1.5 py-0.5 text-[11px] font-bold uppercase text-ink-soft">
          {element.category}
        </span>
      </div>

      <p className="text-[13px] text-ink">{element.condition_observed}</p>

      {element.defect_signatures.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {element.defect_signatures.map((d, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold capitalize ${SEVERITY_STYLE[d.severity]}`}
            >
              {d.signature} · {d.severity}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-ink-soft">No concerns visible</p>
      )}

      {element.recommended_check ? (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-soft">
          <Info size={13} className="mt-0.5 shrink-0" /> {element.recommended_check}
        </p>
      ) : null}

      {thumbnails.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {thumbnails.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${element.element}, referenced photo`}
              onClick={() => onOpenLightbox(url)}
              className="h-12 w-12 cursor-pointer rounded-[4px] border border-line object-cover transition-opacity hover:opacity-80"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
