"use client";

import { useRef, useState } from "react";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { fileToDataUrl } from "@/app/lib/roomState";
import { compressImageFile } from "@/app/lib/imageCompression";
import { MAX_PDF_BYTES, MAX_REQUEST_DATA_URL_CHARS, formatMB } from "@/app/lib/uploadLimits";

export default function UploadReportModal({
  onClose,
  onAnalyze,
}: {
  onClose: () => void;
  onAnalyze: (dataUrl: string) => Promise<void>;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    const isImage = file.type.startsWith("image/");
    if (!isImage && file.size > MAX_PDF_BYTES) {
      setError(`This PDF is ${formatMB(file.size)} — please use one under ${formatMB(MAX_PDF_BYTES)}.`);
      return;
    }

    setAnalyzing(true);
    try {
      const dataUrl = isImage ? await compressImageFile(file) : await fileToDataUrl(file);
      if (dataUrl.length > MAX_REQUEST_DATA_URL_CHARS) {
        setError("That file is still too large to upload. Try a smaller file.");
        return;
      }
      await onAnalyze(dataUrl);
      onClose();
    } catch {
      setError("Couldn't analyze that file. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-[10px] border border-line bg-paper p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-ink">Upload report</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
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
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-ptp-green bg-ptp-green-tint" : "border-line"
          } ${analyzing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        >
          {analyzing ? (
            <>
              <Loader2 size={28} className="animate-spin text-ptp-green" />
              <span className="text-[14px] text-ink-soft">Analyzing…</span>
            </>
          ) : (
            <>
              <UploadCloud size={28} className="text-ink-soft" />
              <span className="text-[14px] text-ink-soft">Drop a PDF or image, or click to browse</span>
            </>
          )}
        </div>

        {error ? <p className="mt-3 text-[14px] text-status-missing">{error}</p> : null}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
