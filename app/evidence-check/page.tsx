"use client";

import { useState } from "react";
import EvidenceUpload, { type StagedImage } from "@/app/components/EvidenceUpload";
import EvidenceResultCard from "@/app/components/EvidenceResultCard";
import EvidenceReport from "@/app/components/EvidenceReport";
import Lightbox from "@/app/components/Lightbox";
import type { EvidenceCheckItem, EvidenceCheckResponse } from "@/app/lib/types";

type ViewMode = "upload" | "results" | "report";

export default function EvidenceCheckPage() {
  const [batch, setBatch] = useState<StagedImage[]>([]);
  const [results, setResults] = useState<EvidenceCheckItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleAnalyze(staged: StagedImage[]) {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/evidence-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: staged.map((s) => s.dataUrl) }),
      });
      if (!res.ok) throw new Error("analyze failed");
      const data: EvidenceCheckResponse = await res.json();
      setBatch(staged);
      setResults(data.results);
      setViewMode("results");
    } catch {
      setError("Couldn't analyze those photos. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: batch.map((image, i) => ({ base64: image.dataUrl, analysis: results[i] })),
        }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "evidence-consistency-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't export the PDF. Try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleStartOver() {
    setBatch([]);
    setResults([]);
    setViewMode("upload");
    setError(null);
  }

  return (
    <div>
      {viewMode !== "report" && (
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-ink">Evidence Consistency</h1>
          <p className="text-[14px] text-ink-soft">
            Checks what the model can see in a photo, blind — no checklist, no caption, no location given.
          </p>
        </div>
      )}

      {error ? <p className="mb-4 text-[14px] text-status-missing">{error}</p> : null}

      {viewMode === "upload" && <EvidenceUpload analyzing={analyzing} onAnalyze={handleAnalyze} />}

      {viewMode === "results" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={handleStartOver} className="text-[14px] font-semibold text-ink-soft hover:text-ink">
              Upload new photos
            </button>
            <button
              onClick={() => setViewMode("report")}
              className="rounded-[6px] bg-ptp-green px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-ptp-green-strong"
            >
              See full report
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {batch.map((image, i) => (
              <EvidenceResultCard
                key={image.id}
                dataUrl={image.dataUrl}
                item={results[i]}
                onOpenLightbox={setLightboxUrl}
              />
            ))}
          </div>
        </>
      )}

      {viewMode === "report" && (
        <EvidenceReport
          batch={batch}
          results={results}
          onBack={() => setViewMode("results")}
          onExportPdf={handleExportPdf}
          exporting={exporting}
        />
      )}

      {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
