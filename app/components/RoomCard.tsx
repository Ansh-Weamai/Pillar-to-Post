"use client";

import { useRef } from "react";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import StatusIcon from "@/app/components/StatusIcon";
import { worstStatus, type ItemState, type RoomPhoto } from "@/app/lib/roomState";
import type { ItemStatus } from "@/app/lib/types";

const SUMMARY_STYLES: Record<ItemStatus, string> = {
  missing: "bg-status-missing-tint text-status-missing",
  partial: "bg-status-partial-tint text-status-partial",
  unchecked: "bg-paper-warm text-ink-soft",
  confirmed: "bg-status-confirmed-tint text-status-confirmed",
};

function summarize(requiredItems: string[], items: Record<string, ItemState>) {
  const counts: Record<ItemStatus, number> = { missing: 0, partial: 0, unchecked: 0, confirmed: 0 };
  for (const name of requiredItems) counts[items[name]?.status ?? "unchecked"]++;

  const worst = worstStatus(requiredItems, items);
  const label =
    worst === "missing"
      ? `${counts.missing} missing`
      : worst === "partial"
        ? `${counts.partial} not visible`
        : worst === "unchecked"
          ? "Awaiting evidence"
          : `${counts.confirmed}/${requiredItems.length} confirmed`;

  return { label, style: SUMMARY_STYLES[worst] };
}

export default function RoomCard({
  location,
  requiredItems,
  items,
  photos,
  checking,
  onAddPhotos,
  onOpenLightbox,
  id,
  expanded,
  onToggle,
}: {
  location: string;
  requiredItems: string[];
  items: Record<string, ItemState>;
  photos: RoomPhoto[];
  checking: boolean;
  onAddPhotos: (location: string, files: FileList) => void;
  onOpenLightbox: (url: string) => void;
  id: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summary = summarize(requiredItems, items);

  return (
    <div id={id} className="mb-4 scroll-mt-6 rounded-[10px] border border-line bg-paper p-5 shadow-sm">
      <button onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2">
          <ChevronDown size={16} className={`shrink-0 text-ink-soft transition-transform ${expanded ? "" : "-rotate-90"}`} />
          <h2 className="text-[16px] font-bold capitalize text-ink">{location}</h2>
        </span>
        <span className={`rounded-[6px] px-2.5 py-1 text-[12px] font-bold ${summary.style}`}>{summary.label}</span>
      </button>

      {expanded && (
        <>
          <div className="mt-3 flex flex-col gap-2">
            {requiredItems.map((item) => {
              const state = items[item] ?? { status: "unchecked" as const };
              return (
                <div key={item} className="flex items-center justify-between border-t border-line pt-2 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-ink">{item}</span>
                    {state.source === "report" && state.status !== "unchecked" ? (
                      <span className="rounded-[4px] bg-paper-warm px-1.5 py-0.5 text-[12px] text-ink-soft">
                        from uploaded report
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {!checking && state.confidence !== undefined && (state.status === "confirmed" || state.status === "partial") ? (
                      <span className="text-[12px] text-ink-soft">{Math.round(state.confidence * 100)}%</span>
                    ) : null}
                    {checking ? (
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft">
                        <Loader2 size={16} className="animate-spin" /> Checking…
                      </span>
                    ) : (
                      <>
                        <StatusIcon status={state.status} />
                        {state.condition === "Needs Repair" || state.condition === "Limitation" ? (
                          <span
                            className={`rounded-[4px] px-1.5 py-0.5 text-[12px] font-bold ${
                              state.condition === "Needs Repair"
                                ? "bg-status-missing-tint text-status-missing"
                                : "bg-status-partial-tint text-status-partial"
                            }`}
                          >
                            {state.condition}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {photos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${photo.url}-${i}`}
                  src={photo.url}
                  alt={`${location} evidence`}
                  onClick={() => onOpenLightbox(photo.url)}
                  className="h-16 w-16 cursor-pointer rounded-[6px] border border-line object-cover transition-opacity hover:opacity-80"
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) onAddPhotos(location, e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={checking}
              className="flex items-center gap-1 rounded-[6px] border border-line px-3 py-1.5 text-[14px] font-semibold text-ink transition-colors hover:border-ptp-green hover:text-ptp-green disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} /> Add photo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
