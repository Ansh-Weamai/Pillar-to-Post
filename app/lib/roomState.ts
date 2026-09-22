import type { ChecklistEntry, ItemCondition, ItemSource, ItemStatus, ItemUpdate } from "@/app/lib/types";

export type ItemState = {
  status: ItemStatus;
  confidence?: number;
  source?: ItemSource;
  condition?: ItemCondition;
};

export type RoomPhoto = {
  url: string;
  source: "demo" | "upload";
};

export type RoomState = {
  location: string;
  requiredItems: string[];
  items: Record<string, ItemState>;
  photos: RoomPhoto[];
  checking: boolean;
};

export function initRooms(checklist: ChecklistEntry[]): RoomState[] {
  return checklist.map((entry) => ({
    location: entry.location,
    requiredItems: entry.required_items,
    items: Object.fromEntries(entry.required_items.map((item) => [item, { status: "unchecked" as const }])),
    photos: [],
    checking: false,
  }));
}

export function applyUpdates(rooms: RoomState[], updates: ItemUpdate[]): RoomState[] {
  const byLocation = new Map<string, ItemUpdate[]>();
  for (const update of updates) {
    const list = byLocation.get(update.location) ?? [];
    list.push(update);
    byLocation.set(update.location, list);
  }

  return rooms.map((room) => {
    const roomUpdates = byLocation.get(room.location);
    if (!roomUpdates) return room;

    const items = { ...room.items };
    const photos = [...room.photos];
    for (const update of roomUpdates) {
      items[update.required_item] = {
        status: update.status,
        confidence: update.confidence,
        source: update.source,
        condition: update.condition,
      };
      if (update.thumbnail && !photos.some((p) => p.url === update.thumbnail)) {
        photos.push({ url: update.thumbnail, source: "demo" });
      }
    }
    return { ...room, items, photos };
  });
}

export function setRoomChecking(rooms: RoomState[], location: string, checking: boolean): RoomState[] {
  return rooms.map((room) => (room.location === location ? { ...room, checking } : room));
}

export function addRoomPhotos(rooms: RoomState[], location: string, urls: string[]): RoomState[] {
  return rooms.map((room) =>
    room.location === location
      ? { ...room, photos: [...room.photos, ...urls.map((url) => ({ url, source: "upload" as const }))] }
      : room
  );
}

export function worstStatus(requiredItems: string[], items: Record<string, ItemState>): ItemStatus {
  const counts: Record<ItemStatus, number> = { missing: 0, partial: 0, unchecked: 0, confirmed: 0 };
  for (const name of requiredItems) counts[items[name]?.status ?? "unchecked"]++;

  if (counts.missing > 0) return "missing";
  if (counts.partial > 0) return "partial";
  if (counts.unchecked > 0) return "unchecked";
  return "confirmed";
}

export function hasAnyResults(rooms: RoomState[]): boolean {
  return rooms.some((room) => room.requiredItems.some((name) => room.items[name]?.source !== undefined));
}

const SOURCE_LABELS: Record<ItemSource, string> = {
  demo: "Load demo data",
  upload: "Manual photo uploads",
  report: "Uploaded report",
};

export function describeSources(rooms: RoomState[]): string {
  const present = new Set<ItemSource>();
  for (const room of rooms) {
    for (const name of room.requiredItems) {
      const source = room.items[name]?.source;
      if (source) present.add(source);
    }
  }
  if (present.size === 0) return "No checks run yet";
  return Array.from(present)
    .map((source) => SOURCE_LABELS[source])
    .join(" + ");
}

export function roomId(location: string): string {
  return `room-${location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function urlToDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
