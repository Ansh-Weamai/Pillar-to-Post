"use client";

import { useState } from "react";
import EvidenceUpload, { type StagedImage } from "@/app/components/EvidenceUpload";
import EvidenceResultCard from "@/app/components/EvidenceResultCard";
import EvidenceReport from "@/app/components/EvidenceReport";
import RoomWalkthroughUpload, { type StagedImage as RoomStagedImage } from "@/app/components/RoomWalkthroughUpload";
import RoomWalkthroughResults from "@/app/components/RoomWalkthroughResults";
import RoomWalkthroughReport from "@/app/components/RoomWalkthroughReport";
import Lightbox from "@/app/components/Lightbox";
import type { EvidenceCheckItem, EvidenceCheckResponse, RoomWalkthroughCheckResponse, RoomWalkthroughResult } from "@/app/lib/types";

type Mode = "single" | "room";
type ViewMode = "upload" | "results" | "report";

const MODES: { key: Mode; label: string }[] = [
  { key: "single", label: "Single Photo" },
  { key: "room", label: "Room Walkthrough" },
];

export default function EvidenceCheckPage() {
  const [mode, setMode] = useState<Mode>("single");

  // Single Photo mode state
  const [batch, setBatch] = useState<StagedImage[]>([]);
  const [results, setResults] = useState<EvidenceCheckItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Room Walkthrough mode state
  const [roomBatch, setRoomBatch] = useState<RoomStagedImage[]>([]);
  const [roomResult, setRoomResult] = useState<RoomWalkthroughResult | null>(null);
  const [roomViewMode, setRoomViewMode] = useState<ViewMode>("upload");
  const [roomAnalyzing, setRoomAnalyzing] = useState(false);
  const [roomExporting, setRoomExporting] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

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
          mode: "single",
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

  async function handleAnalyzeRoom(room: string, staged: RoomStagedImage[]) {
    setRoomAnalyzing(true);
    setRoomError(null);
    try {
      const res = await fetch("/api/room-walkthrough-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, images: staged.map((s) => s.dataUrl) }),
      });
      if (!res.ok) throw new Error("analyze failed");
      const data: RoomWalkthroughCheckResponse = await res.json();
      if ("error" in data && data.error) {
        setRoomError(data.message ?? "Couldn't analyze that room.");
        return;
      }
      if ("result" in data) {
        setRoomBatch(staged);
        setRoomResult(data.result);
        setRoomViewMode("results");
      }
    } catch {
      setRoomError("Couldn't analyze that room. Try again.");
    } finally {
      setRoomAnalyzing(false);
    }
  }

  async function handleExportRoomPdf() {
    if (!roomResult) return;
    setRoomExporting(true);
    setRoomError(null);
    try {
      const res = await fetch("/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "room",
          images: roomBatch.map((image) => image.dataUrl),
          result: roomResult,
        }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "room-walkthrough-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setRoomError("Couldn't export the PDF. Try again.");
    } finally {
      setRoomExporting(false);
    }
  }

  function handleRoomStartOver() {
    setRoomBatch([]);
    setRoomResult(null);
    setRoomViewMode("upload");
    setRoomError(null);
  }

  const showChrome = !(mode === "single" && viewMode === "report") && !(mode === "room" && roomViewMode === "report");

  return (
    <div>
      {showChrome && (
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-ink">Evidence Consistency</h1>
          <p className="mb-4 text-[14px] text-ink-soft">
            {mode === "single"
              ? "Checks what the model can see in a photo, blind — no checklist, no caption, no location given."
              : "Reviews several photos of one room together and decides for itself what's worth checking — no fixed checklist."}
          </p>

          <div className="inline-flex rounded-[8px] border border-line bg-paper-warm p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`rounded-[6px] px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                  mode === m.key ? "bg-ptp-green text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "single" ? (
        <>
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
        </>
      ) : (
        <>
          {roomError ? <p className="mb-4 text-[14px] text-status-missing">{roomError}</p> : null}

          {roomViewMode === "upload" && <RoomWalkthroughUpload analyzing={roomAnalyzing} onAnalyze={handleAnalyzeRoom} />}

          {roomViewMode === "results" && roomResult && (
            <RoomWalkthroughResults
              result={roomResult}
              images={roomBatch.map((b) => b.dataUrl)}
              onStartOver={handleRoomStartOver}
              onSeeFullReport={() => setRoomViewMode("report")}
              onOpenLightbox={setLightboxUrl}
            />
          )}

          {roomViewMode === "report" && roomResult && (
            <RoomWalkthroughReport
              result={roomResult}
              images={roomBatch.map((b) => b.dataUrl)}
              onBack={() => setRoomViewMode("results")}
              onExportPdf={handleExportRoomPdf}
              exporting={roomExporting}
            />
          )}
        </>
      )}

      {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
