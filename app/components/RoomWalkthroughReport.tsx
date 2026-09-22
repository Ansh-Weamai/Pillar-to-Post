"use client";

import { ArrowLeft, Download, Loader2, Info } from "lucide-react";
import type { RoomWalkthroughResult } from "@/app/lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  low: "bg-status-partial-tint text-status-partial",
  medium: "bg-status-partial-tint text-status-partial",
  high: "bg-status-missing-tint text-status-missing",
};

export default function RoomWalkthroughReport({
  result,
  images,
  onBack,
  onExportPdf,
  exporting,
}: {
  result: RoomWalkthroughResult;
  images: string[];
  onBack: () => void;
  onExportPdf: () => void;
  exporting: boolean;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[14px] font-bold text-ink-soft hover:text-ink">
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={onExportPdf}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-[6px] border border-line px-4 py-2 text-[14px] font-bold text-ink transition-colors hover:border-ptp-green hover:text-ptp-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? "Exporting…" : "Export as PDF"}
        </button>
      </div>

      <h1 className="mb-1 text-[20px] font-bold capitalize text-ink">{result.room}</h1>
      <p className="mb-4 text-[14px] text-ink-soft">{result.overall_summary}</p>

      <div className="mb-8 flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${result.room}, photo ${i + 1}`} className="h-32 w-32 rounded-[8px] border border-line object-cover" />
            <span className="absolute bottom-1 left-1 rounded-[4px] bg-ink/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {result.detected_elements.map((element, i) => (
          <div key={i} className="border-b border-line pb-6 last:border-b-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold capitalize text-ink">{element.element}</h3>
              <span className="whitespace-nowrap rounded-[4px] bg-paper-warm px-1.5 py-0.5 text-[11px] font-bold uppercase text-ink-soft">
                {element.category}
              </span>
            </div>
            <p className="text-[13px] text-ink-soft">
              Seen in photo{element.seen_in_images.length > 1 ? "s" : ""} {element.seen_in_images.join(", ")}
            </p>
            <p className="mt-2 text-[14px] text-ink">{element.condition_observed}</p>

            {element.defect_signatures.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {element.defect_signatures.map((d, di) => (
                  <span
                    key={di}
                    className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[12px] font-bold capitalize ${SEVERITY_STYLE[d.severity]}`}
                  >
                    {d.signature} · {d.severity} · {Math.round(d.confidence * 100)}%
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-ink-soft">No concerns visible</p>
            )}

            {element.recommended_check ? (
              <p className="mt-2 flex items-start gap-1.5 text-[13px] text-ink-soft">
                <Info size={14} className="mt-0.5 shrink-0" /> {element.recommended_check}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
