"use client";

import { useState } from "react";
import ContradictionInputs from "@/app/components/ContradictionInputs";
import ContradictionVerdict from "@/app/components/ContradictionVerdict";
import ContradictionHistory, { type HistoryEntry } from "@/app/components/ContradictionHistory";
import { urlToDataUrl } from "@/app/lib/roomState";
import { compressImageFile } from "@/app/lib/imageCompression";
import type { ContradictionCheckResponse, ContradictionPair, ContradictionResult } from "@/app/lib/types";

export default function ContradictionCheckPage() {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [findingText, setFindingText] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ContradictionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function loadSamplePhoto(pair: ContradictionPair) {
    const dataUrl = await urlToDataUrl(pair.photoPath);
    setPhotoDataUrl(dataUrl);
  }

  async function uploadPhoto(file: File) {
    const dataUrl = await compressImageFile(file);
    setPhotoDataUrl(dataUrl);
  }

  async function runCheck() {
    if (!photoDataUrl || !findingText.trim()) return;

    setChecking(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/contradiction-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoDataUrl, findingText }),
      });
      const data: ContradictionCheckResponse = await res.json();

      if ("error" in data) {
        setResult(null);
        setErrorMessage(data.message ?? "Couldn't check that pairing.");
        return;
      }

      setResult(data.result);
      setHistory((prev) => [
        {
          id: `${Date.now()}`,
          thumbnail: photoDataUrl,
          findingText,
          verdict: data.result.verdict,
          confidence: data.result.confidence,
          recommended_action: data.result.recommended_action,
        },
        ...prev,
      ]);
    } catch {
      setResult(null);
      setErrorMessage("Couldn't check that pairing. Try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-ink">Contradiction Flag</h1>
        <p className="text-[14px] text-ink-soft">
          Checks a photo against the inspector&apos;s written finding for agreement, both ways.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ContradictionInputs
          photoDataUrl={photoDataUrl}
          onPhotoSample={loadSamplePhoto}
          onPhotoUpload={uploadPhoto}
          findingText={findingText}
          onFindingSample={(pair) => setFindingText(pair.findingText)}
          onFindingTextChange={setFindingText}
          onCheck={runCheck}
          checking={checking}
        />

        <div className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
          <ContradictionVerdict result={result} errorMessage={errorMessage} checking={checking} onRetry={runCheck} />
        </div>
      </div>

      <ContradictionHistory entries={history} />
    </div>
  );
}
