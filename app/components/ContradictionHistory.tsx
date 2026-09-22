import type { DefectAction } from "@/app/lib/types";

export type HistoryEntry = {
  id: string;
  thumbnail: string;
  findingText: string;
  verdict: "match" | "mismatch";
  confidence: number;
  recommended_action: DefectAction;
};

export default function ContradictionHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-[14px] font-bold text-ink">Session history</h2>
      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-[8px] border border-line bg-paper p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.thumbnail}
              alt=""
              className="h-12 w-12 shrink-0 rounded-[6px] border border-line object-cover"
            />
            <p className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{entry.findingText}</p>
            <span
              className={`shrink-0 rounded-[6px] px-2 py-1 text-[12px] font-bold ${
                entry.verdict === "match"
                  ? "bg-status-confirmed-tint text-status-confirmed"
                  : "bg-status-missing-tint text-status-missing"
              }`}
            >
              {entry.verdict === "match" ? "MATCH" : "MISMATCH"}
            </span>
            <span className="w-12 shrink-0 text-right text-[12px] text-ink-soft">
              {Math.round(entry.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
