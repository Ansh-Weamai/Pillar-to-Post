import type { DefectSeverity, ItemCondition, ItemStatus } from "@/app/lib/types";

// Shared visual language for every generated PDF (gap report, evidence
// report, room walkthrough report) — mirrors the color tokens in
// app/globals.css / the on-screen badge components, so an exported PDF
// reads as the same product as the app instead of a plain text dump.
export const INK = "#0a0a0a";
export const INK_SOFT = "#4b4b4b";
export const LINE = "#e4e4e1";
export const PAPER_WARM = "#f7f5f0";
export const BRAND_GREEN = "#3e7a1c";
export const BRAND_GREEN_STRONG = "#2e5e12";
export const BRAND_GREEN_TINT = "#e7f1dc";

export type Swatch = { bg: string; fg: string };

const GREEN: Swatch = { bg: BRAND_GREEN_TINT, fg: BRAND_GREEN };
const AMBER: Swatch = { bg: "#fbedda", fg: "#c97a0a" };
const RED: Swatch = { bg: "#fbe6e4", fg: "#c6221b" };
const NEUTRAL: Swatch = { bg: PAPER_WARM, fg: INK_SOFT };

export const SEVERITY_COLOR: Record<DefectSeverity, Swatch> = { low: GREEN, medium: AMBER, high: RED };
export const SEVERITY_LABEL: Record<DefectSeverity, string> = { low: "Low", medium: "Medium", high: "High" };

export const CONDITION_COLOR: Record<NonNullable<ItemCondition>, Swatch> = {
  Satisfactory: GREEN,
  "Needs Repair": RED,
  Limitation: AMBER,
};

export const STATUS_COLOR: Record<Exclude<ItemStatus, "confirmed">, Swatch> = {
  unchecked: NEUTRAL,
  partial: AMBER,
  missing: RED,
};

export const EVIDENCE_STATUS_COLOR: Record<"clean" | "minor_concerns" | "needs_review" | "unusable", Swatch> = {
  clean: GREEN,
  minor_concerns: AMBER,
  needs_review: RED,
  unusable: NEUTRAL,
};

export const EVIDENCE_STATUS_LABEL: Record<"clean" | "minor_concerns" | "needs_review" | "unusable", string> = {
  clean: "Clean",
  minor_concerns: "Minor concerns",
  needs_review: "Needs review",
  unusable: "Unusable",
};

// The Room Walkthrough model's "category" is freeform text, not a fixed
// enum — colors are assigned deterministically by hashing the string, same
// approach (and same hash) as app/lib/categoryStyle.ts, so a category reads
// in the same color on screen and in the exported PDF.
const CATEGORY_PALETTE: Swatch[] = [
  { bg: "#dbeafe", fg: "#1d4ed8" }, // blue
  { bg: "#ede9fe", fg: "#6d28d9" }, // violet
  { bg: "#ccfbf1", fg: "#0f766e" }, // teal
  { bg: "#fae8ff", fg: "#a21caf" }, // fuchsia
  { bg: "#e0e7ff", fg: "#4338ca" }, // indigo
  { bg: "#cffafe", fg: "#0e7490" }, // cyan
  { bg: "#ffedd5", fg: "#c2410c" }, // orange
  { bg: "#ecfccb", fg: "#4d7c0f" }, // lime
];

export function categoryColor(category: string): Swatch {
  const key = category.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

const BADGE_PAD_X = 6;
const BADGE_PAD_Y = 3;

// Pure measurement, no drawing — lets a caller right-align or lay out a row
// of badges before committing any ink.
export function badgeWidth(doc: PDFKit.PDFDocument, text: string, fontSize = 8.5): number {
  doc.font("Helvetica-Bold").fontSize(fontSize);
  return doc.widthOfString(text) + BADGE_PAD_X * 2;
}

export function badgeHeight(fontSize = 8.5): number {
  return fontSize + BADGE_PAD_Y * 2;
}

// Draws a colored pill at (x, y) — y is the TOP of the badge, matching how
// pdfkit's doc.text(str, x, y) treats y, so a badge and a text line sharing
// the same y line up. Leaves the document's font/size/fill mutated
// (pdfkit's text state is global) — callers reset what they need after.
export function drawBadge(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  swatch: Swatch,
  fontSize = 8.5
): number {
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const width = doc.widthOfString(text) + BADGE_PAD_X * 2;
  const height = fontSize + BADGE_PAD_Y * 2;
  doc.roundedRect(x, y, width, height, 3).fill(swatch.bg);
  doc.fillColor(swatch.fg).text(text, x + BADGE_PAD_X, y + BADGE_PAD_Y, { lineBreak: false });
  return width;
}

export function drawBadgeRight(
  doc: PDFKit.PDFDocument,
  text: string,
  rightX: number,
  y: number,
  swatch: Swatch,
  fontSize = 8.5
): number {
  const width = badgeWidth(doc, text, fontSize);
  drawBadge(doc, text, rightX - width, y, swatch, fontSize);
  return rightX - width;
}

// Rounded card background, drawn BEFORE its content so content paints on
// top of it — callers measure content height first (doc.heightOfString)
// since pdfkit has no way to draw behind content already on the page.
export function drawCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  doc.roundedRect(x, y, width, height, 6).fillAndStroke(PAPER_WARM, LINE);
}

// Starts a fresh page if the next block won't fit above the bottom margin.
export function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + needed > bottom) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
}

// A small colored accent bar used as a letterhead/section marker instead of
// a plain gray divider line.
export function drawAccentBar(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height = 3) {
  doc.rect(x, y, width, height).fill(BRAND_GREEN);
}
