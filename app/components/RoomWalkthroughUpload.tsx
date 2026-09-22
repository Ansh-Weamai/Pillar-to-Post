"use client";

import { useRef, useState } from "react";
import { UploadCloud, X, Loader2, ScanSearch } from "lucide-react";
import { fileToDataUrl } from "@/app/lib/roomState";
import checklist from "@/data/checklist.json";

const MAX_IMAGES = 6;
const ROOMS = checklist.map((entry) => entry.location);

export type StagedImage = { id: string; name: string; dataUrl: string };

export default function RoomWalkthroughUpload({
  analyzing,
  onAnalyze,
}: {
  analyzing: boolean;
  onAnalyze: (room: string, images: StagedImage[]) => void;
}) {
  const [room, setRoom] = useState(ROOMS[0] ?? "");
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const room = Math.max(MAX_IMAGES - staged.length, 0);

    setError(files.length > room ? `Up to ${MAX_IMAGES} photos per room.` : null);

    const accepted = files.slice(0, room);
    if (accepted.length === 0) return;

    const dataUrls = await Promise.all(accepted.map(fileToDataUrl));
    setStaged((prev) => [
      ...prev,
      ...accepted.map((file, i) => ({ id: `${Date.now()}-${i}-${file.name}`, name: file.name, dataUrl: dataUrls[i] })),
    ]);
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Room</label>
        <select
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="w-full rounded-[6px] border border-line bg-paper px-3 py-2 text-[14px] capitalize text-ink sm:w-[280px]"
        >
          {ROOMS.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-ptp-green bg-ptp-green-tint" : "border-line"
        }`}
      >
        <UploadCloud size={28} className="text-ink-soft" />
        <span className="text-[14px] text-ink-soft">Drop about 4 photos of this room, or click to browse</span>
        <span className="text-[12px] text-ink-soft">One per wall/angle works well — up to {MAX_IMAGES}, no fixed checklist</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error ? <p className="mt-3 text-[14px] text-status-missing">{error}</p> : null}

      {staged.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {staged.map((s, i) => (
              <div key={s.id} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.dataUrl} alt={s.name} className="h-20 w-20 rounded-[6px] border border-line object-cover" />
                <span className="absolute bottom-1 left-1 rounded-[4px] bg-ink/70 px-1 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <button
                  onClick={() => removeStaged(s.id)}
                  aria-label={`Remove ${s.name}`}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-white hover:bg-status-missing"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onAnalyze(room, staged)}
              disabled={analyzing || !room}
              className="flex items-center gap-1.5 rounded-[6px] bg-ptp-green px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-ptp-green-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}
              {analyzing ? "Analyzing…" : `Analyze ${staged.length} photo${staged.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
