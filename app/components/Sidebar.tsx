"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { statusDotClassName } from "@/app/components/StatusIcon";
import { worstStatus, roomId, type RoomState } from "@/app/lib/roomState";

export default function Sidebar({ rooms, onSelect }: { rooms: RoomState[]; onSelect: (location: string) => void }) {
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());

  function toggle(location: string) {
    setOpenLocations((prev) => {
      const next = new Set(prev);
      if (next.has(location)) next.delete(location);
      else next.add(location);
      return next;
    });
  }

  function scrollToRoom(location: string) {
    document.getElementById(roomId(location))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="sticky top-6 max-h-[calc(100vh-48px)] w-[280px] shrink-0 self-start overflow-y-auto pr-2">
      <h2 className="mb-2 text-[14px] font-bold uppercase tracking-wide text-ink-soft">Checklist</h2>
      <div className="flex flex-col">
        {rooms.map((room) => {
          const open = openLocations.has(room.location);
          return (
            <div key={room.location} className="border-b border-line">
              <button
                onClick={() => {
                  toggle(room.location);
                  onSelect(room.location);
                  scrollToRoom(room.location);
                }}
                className="flex w-full items-center gap-2 py-2.5 text-left"
                aria-expanded={open}
              >
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-ink-soft transition-transform ${open ? "" : "-rotate-90"}`}
                />
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${statusDotClassName(worstStatus(room.requiredItems, room.items))}`}
                />
                <span className="flex-1 truncate text-[14px] font-bold text-ink">{room.location}</span>
              </button>
              {open && (
                <div className="mb-2 flex flex-col gap-1.5 pb-1 pl-[22px]">
                  {room.requiredItems.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[14px] text-ink-soft">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClassName(room.items[item]?.status ?? "unchecked")}`}
                      />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
