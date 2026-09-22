import RoomWalkthroughElementCard from "@/app/components/RoomWalkthroughElementCard";
import { formatText } from "@/app/lib/textFormat";
import type { RoomWalkthroughResult } from "@/app/lib/types";

export default function RoomWalkthroughResults({
  result,
  images,
  onStartOver,
  onSeeFullReport,
  onOpenLightbox,
}: {
  result: RoomWalkthroughResult;
  images: string[];
  onStartOver: () => void;
  onSeeFullReport: () => void;
  onOpenLightbox: (url: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onStartOver} className="text-[14px] font-semibold text-ink-soft hover:text-ink">
          Analyze a different room
        </button>
        <button
          onClick={onSeeFullReport}
          className="rounded-[6px] bg-ptp-green px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-ptp-green-strong"
        >
          See full report
        </button>
      </div>

      <div className="mb-5 rounded-[10px] border border-line bg-paper-warm p-4">
        <p className="text-[13px] font-bold capitalize text-ink">{result.room}</p>
        <p className="mt-0.5 whitespace-pre-line text-[13px] text-ink-soft">{formatText(result.overall_summary)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {result.detected_elements.map((element, i) => (
          <RoomWalkthroughElementCard
            key={i}
            element={element}
            thumbnails={element.seen_in_images.map((idx) => images[idx - 1]).filter(Boolean)}
            onOpenLightbox={onOpenLightbox}
          />
        ))}
      </div>
    </div>
  );
}
