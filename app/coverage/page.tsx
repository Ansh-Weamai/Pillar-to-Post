"use client";

import { useState } from "react";
import { UploadCloud, Sparkles } from "lucide-react";
import checklist from "@/data/checklist.json";
import Sidebar from "@/app/components/Sidebar";
import RoomCard from "@/app/components/RoomCard";
import Lightbox from "@/app/components/Lightbox";
import UploadReportModal from "@/app/components/UploadReportModal";
import {
  initRooms,
  applyUpdates,
  setRoomChecking,
  addRoomPhotos,
  fileToDataUrl,
  roomId,
} from "@/app/lib/roomState";
import type { CheckRoomResponse, CoverageCheckResponse, UploadReportResponse } from "@/app/lib/types";

export default function CoveragePage() {
  const [rooms, setRooms] = useState(() => initRooms(checklist));
  const [demoLoading, setDemoLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  function toggleRoom(location: string) {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(location)) next.delete(location);
      else next.add(location);
      return next;
    });
  }

  function expandRoom(location: string) {
    setExpandedRooms((prev) => new Set(prev).add(location));
  }

  async function handleLoadDemoData() {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/coverage-check", { method: "POST" });
      const data: CoverageCheckResponse = await res.json();
      setRooms((prev) => applyUpdates(prev, data.updates));
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleAddPhotos(location: string, fileList: FileList) {
    const files = Array.from(fileList);
    const dataUrls = await Promise.all(files.map(fileToDataUrl));

    setRooms((prev) => addRoomPhotos(prev, location, dataUrls));
    setRooms((prev) => setRoomChecking(prev, location, true));

    try {
      const res = await fetch("/api/check-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, images: dataUrls }),
      });
      const data: CheckRoomResponse = await res.json();
      setRooms((prev) => applyUpdates(prev, data.updates));
    } finally {
      setRooms((prev) => setRoomChecking(prev, location, false));
    }
  }

  async function handleUploadReport(dataUrl: string) {
    const res = await fetch("/api/upload-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data: UploadReportResponse = await res.json();
    setRooms((prev) => applyUpdates(prev, data.updates));
  }

  return (
    <div className="flex gap-8">
      <Sidebar rooms={rooms} onSelect={expandRoom} />

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[6px] border border-line px-4 py-2 text-[14px] font-bold text-ink transition-colors hover:border-ptp-green hover:text-ptp-green"
          >
            <UploadCloud size={16} /> Upload report
          </button>
          <button
            onClick={handleLoadDemoData}
            disabled={demoLoading}
            className="flex items-center gap-1.5 rounded-[6px] bg-ptp-green px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-ptp-green-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={16} /> {demoLoading ? "Loading…" : "Load demo data"}
          </button>
        </div>

        {rooms.map((room) => (
          <RoomCard
            key={room.location}
            id={roomId(room.location)}
            location={room.location}
            requiredItems={room.requiredItems}
            items={room.items}
            photos={room.photos}
            checking={room.checking}
            onAddPhotos={handleAddPhotos}
            onOpenLightbox={setLightboxUrl}
            expanded={expandedRooms.has(room.location)}
            onToggle={() => toggleRoom(room.location)}
          />
        ))}
      </div>

      {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {reportModalOpen && (
        <UploadReportModal onClose={() => setReportModalOpen(false)} onAnalyze={handleUploadReport} />
      )}
    </div>
  );
}
