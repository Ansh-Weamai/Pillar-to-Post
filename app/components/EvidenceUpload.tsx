"use client";

import { useRef, useState } from "react";
import { UploadCloud, X, Loader2, ImagePlus } from "lucide-react";
import { compressImageFile } from "@/app/lib/imageCompression";
import { MAX_REQUEST_DATA_URL_CHARS, totalDataUrlChars } from "@/app/lib/uploadLimits";

const MAX_IMAGES = 10;

export type StagedImage = { id: string; name: string; dataUrl: string };

export default function EvidenceUpload({
  analyzing,
  onAnalyze,
}: {
  analyzing: boolean;
  onAnalyze: (images: StagedImage[]) => void;
}) {
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const room = Math.max(MAX_IMAGES - staged.length, 0);

    if (files.length > room) {
      setError(`Up to ${MAX_IMAGES} photos per batch.`);
    } else {
      setError(null);
    }

    const accepted = files.slice(0, room);
    if (accepted.length === 0) return;

    const dataUrls = await Promise.all(accepted.map(compressImageFile));
    const existingChars = totalDataUrlChars(staged.map((s) => s.dataUrl));
    if (existingChars + totalDataUrlChars(dataUrls) > MAX_REQUEST_DATA_URL_CHARS) {
      setError("These photos are too large to upload together. Try fewer at a time.");
      return;
    }

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
        <span className="text-[14px] text-ink-soft">Drop 1–10 photos, or click to browse</span>
        <span className="text-[12px] text-ink-soft">No checklist or location needed — each photo is read blind</span>
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
            {staged.map((s) => (
              <div key={s.id} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.dataUrl} alt={s.name} className="h-20 w-20 rounded-[6px] border border-line object-cover" />
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
              onClick={() => onAnalyze(staged)}
              disabled={analyzing}
              className="flex items-center gap-1.5 rounded-[6px] bg-ptp-green px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-ptp-green-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {analyzing ? "Analyzing…" : `Analyze ${staged.length} photo${staged.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
