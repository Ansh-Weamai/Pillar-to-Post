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

// Feature 2 — Evidence Consistency: blind per-image read, no checklist/location given by the user.
export type DefectSeverity = "low" | "medium" | "high";
export type DefectAction = "pass" | "flag_for_review";
export type ImageQualityIssue = "blurry" | "too_dark" | "obstructed" | null;

export type DefectSignature = {
  signature: string;
  description: string;
  severity: DefectSeverity;
  confidence: number;
  region: string;
  recommended_action: DefectAction;
};

export type EvidenceCheckResult = {
  image_id: string;
  detected_location: string | null;
  location_confidence: number | null;
  image_quality: {
    usable: boolean;
    issue: ImageQualityIssue;
  };
  defect_signatures: DefectSignature[];
  overall: {
    risk_score: number;
    status: "clean" | "minor_concerns" | "needs_review" | "unusable";
    recommended_action: DefectAction | "retake_photo";
    summary: string;
  };
};

export type EvidenceCheckItem =
  | { image_id: string; analysis: EvidenceCheckResult; error?: false }
  | { image_id: string; error: true };

export type EvidenceCheckResponse = {
  results: EvidenceCheckItem[];
};

// Feature 3 — Contradiction Flag: one photo + one finding text, checked together.
export type Omission = {
  description: string;
  severity: DefectSeverity;
  confidence: number;
};

export type ContradictionResult = {
  verdict: "match" | "mismatch";
  confidence: number;
  reasoning: string;
  omissions: Omission[];
  recommended_action: DefectAction;
};

export type ContradictionCheckResponse = { result: ContradictionResult } | { error: true; message?: string };

export type ContradictionPair = {
  id: number;
  photoLabel: string;
  photoPath: string;
  findingLabel: string;
  findingText: string;
};
