"use client";

import { ArrowLeft, Download, Loader2 } from "lucide-react";
import EvidenceStatusBadge from "@/app/components/EvidenceStatusBadge";
import type { EvidenceCheckItem } from "@/app/lib/types";
import type { StagedImage } from "@/app/components/EvidenceUpload";

export default function EvidenceReport({
  batch,
  results,
  onBack,
  onExportPdf,
  exporting,
}: {
  batch: StagedImage[];
  results: EvidenceCheckItem[];
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

      <div className="flex flex-col gap-10">
        {batch.map((image, i) => {
          const item = results[i];
          return (
            <div key={image.id} className="flex flex-col items-center gap-4 border-b border-line pb-10 last:border-b-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={image.name}
                className="w-full max-w-[500px] rounded-[10px] border border-line object-contain"
              />

              <div className="w-full max-w-[500px]">
                {item.error ? (
                  <p className="text-[14px] font-semibold text-status-missing">
                    This photo couldn&apos;t be analyzed. Try re-uploading it.
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[13px] capitalize text-ink-soft">
                        {item.analysis.detected_location ?? "Location unclear"}
                      </span>
                      <EvidenceStatusBadge status={item.analysis.overall.status} />
                    </div>

                    {item.analysis.defect_signatures.length === 0 ? (
                      <p className="text-[14px] text-ink-soft">Nothing concerning was visible.</p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {item.analysis.defect_signatures.map((d, di) => (
                          <li key={di} className="rounded-[8px] border border-line bg-paper-warm p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[14px] font-bold capitalize text-ink">{d.signature}</span>
                              <span className="text-[12px] font-bold uppercase text-ink-soft">{d.severity}</span>
                            </div>
                            <p className="text-[13px] text-ink">{d.description}</p>
                            <p className="mt-1 text-[12px] text-ink-soft">
                              {d.region} · {Math.round(d.confidence * 100)}% confidence ·{" "}
                              {d.recommended_action === "flag_for_review" ? "Flag for review" : "Pass"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <p className="text-[13px] text-ink">{item.analysis.overall.summary}</p>
                      <span className="whitespace-nowrap text-[12px] font-bold text-ink-soft">
                        Risk {item.analysis.overall.risk_score}/100
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
