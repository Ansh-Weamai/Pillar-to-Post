"use client";

import { X } from "lucide-react";

export default function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={24} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Evidence photo, enlarged"
        className="max-h-full max-w-full rounded-[8px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
