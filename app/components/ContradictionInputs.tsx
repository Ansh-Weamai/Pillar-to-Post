"use client";

import { useRef } from "react";
import { UploadCloud } from "lucide-react";
import contradictionPairs from "@/data/contradiction-pairs.json";
import type { ContradictionPair } from "@/app/lib/types";

const PAIRS = contradictionPairs as ContradictionPair[];

export default function ContradictionInputs({
  photoDataUrl,
  onPhotoSample,
  onPhotoUpload,
  findingText,
  onFindingSample,
  onFindingTextChange,
  onCheck,
  checking,
}: {
  photoDataUrl: string | null;
  onPhotoSample: (pair: ContradictionPair) => void;
  onPhotoUpload: (file: File) => void;
  findingText: string;
  onFindingSample: (pair: ContradictionPair) => void;
  onFindingTextChange: (text: string) => void;
  onCheck: () => void;
  checking: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Photo</label>
        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              const pair = PAIRS.find((p) => p.id === Number(e.target.value));
              if (pair) onPhotoSample(pair);
            }}
            className="flex-1 rounded-[6px] border border-line bg-paper px-3 py-2 text-[14px] text-ink"
          >
            <option value="" disabled>
              Load sample…
            </option>
            {PAIRS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.photoLabel}
              </option>
            ))}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-[6px] border border-line px-3 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-ptp-green hover:text-ptp-green"
          >
            <UploadCloud size={16} /> Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPhotoUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoDataUrl}
            alt="Selected evidence photo"
            className="mt-3 h-40 w-full rounded-[8px] border border-line object-cover"
          />
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Finding text</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const pair = PAIRS.find((p) => p.id === Number(e.target.value));
            if (pair) onFindingSample(pair);
          }}
          className="mb-2 w-full rounded-[6px] border border-line bg-paper px-3 py-2 text-[14px] text-ink"
        >
          <option value="" disabled>
            Load sample…
          </option>
          {PAIRS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.findingLabel}
            </option>
          ))}
        </select>
        <textarea
          value={findingText}
          onChange={(e) => onFindingTextChange(e.target.value)}
          placeholder="Paste or type the inspector's finding text…"
          rows={5}
          className="w-full resize-none rounded-[6px] border border-line bg-paper px-3 py-2 text-[14px] text-ink"
        />
      </div>

      <button
        onClick={onCheck}
        disabled={checking || !photoDataUrl || !findingText.trim()}
        className="flex items-center justify-center gap-1.5 rounded-[6px] bg-ptp-green px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-ptp-green-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checking ? "Checking…" : "Check agreement"}
      </button>
    </div>
  );
}
