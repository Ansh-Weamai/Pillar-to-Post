export type ChecklistEntry = { location: string; required_items: string[] };

export type ItemSource = "demo" | "upload" | "report";
export type ItemStatus = "unchecked" | "missing" | "partial" | "confirmed";

export type ItemUpdate = {
  location: string;
  required_item: string;
  status: Exclude<ItemStatus, "unchecked">;
  confidence?: number;
  thumbnail?: string;
  source: ItemSource;
};

export type CoverageCheckResponse = {
  updates: ItemUpdate[];
};

export type CheckRoomResponse = {
  updates: ItemUpdate[];
};

export type UploadReportResponse = {
  updates: ItemUpdate[];
};
