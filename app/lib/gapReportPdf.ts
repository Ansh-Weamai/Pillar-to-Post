import PDFDocument from "pdfkit";
import { STATUS_LABELS } from "@/app/lib/itemStatus";
import {
  badgeHeight,
  badgeWidth,
  CONDITION_COLOR,
  drawAccentBar,
  drawBadge,
  INK,
  INK_SOFT,
  STATUS_COLOR,
  type Swatch,
} from "@/app/lib/pdfStyle";
import type { ItemCondition, ItemStatus } from "@/app/lib/types";

export type GapReportRoom = {
  location: string;
  requiredItems: string[];
  items: Record<string, { status: ItemStatus; condition?: ItemCondition }>;
};

function isFlaggedCondition(condition: ItemCondition | undefined): condition is "Needs Repair" | "Limitation" {
  return condition === "Needs Repair" || condition === "Limitation";
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string, x: number, y: number): number {
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(13).text(title, x, y);
  const afterTitleY = doc.y + 5;
  drawAccentBar(doc, x, afterTitleY, 26, 2.5);
  return afterTitleY + 12;
}

function roomHeading(doc: PDFKit.PDFDocument, name: string, x: number, y: number): number {
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(11.5).text(name, x, y);
  return doc.y + 4;
}

function itemRow(
  doc: PDFKit.PDFDocument,
  name: string,
  badgeText: string,
  swatch: Swatch,
  x: number,
  y: number,
  right: number
): number {
  const bw = badgeWidth(doc, badgeText, 8.5);
  doc
    .fillColor(INK)
    .font("Helvetica")
    .fontSize(10)
    .text(name, x, y, { width: right - x - bw - 10 });
  const textBottom = doc.y;
  drawBadge(doc, badgeText, right - bw, y - 1, swatch, 8.5);
  return Math.max(textBottom, y - 1 + badgeHeight(8.5)) + 6;
}

// Starts a fresh page if the next block won't fit above the bottom margin.
function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + needed > bottom) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
}

// Re-lays out whatever Coverage Check already has in state as a PDF — never
// runs a new check. Every room/item/status/condition here comes from the
// caller's live rooms array (itself built from checklist.json), never from a
// literal name written in this file.
export function renderGapReportPdf(rooms: GapReportRoom[], source: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const right = left + pageWidth;

  let confirmedClean = 0;
  let needsAttention = 0;
  let notDocumented = 0;
  for (const room of rooms) {
    for (const name of room.requiredItems) {
      const item = room.items[name];
      const status = item?.status ?? "unchecked";
      if (status !== "confirmed") {
        notDocumented++;
      } else if (isFlaggedCondition(item?.condition)) {
        needsAttention++;
      } else {
        confirmedClean++;
      }
    }
  }

  let y = doc.page.margins.top;

  // Letterhead
  doc.rect(left, y, 4, 36).fill(CONDITION_COLOR.Satisfactory.fg);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(18).text("PTP360 Second-Pass QA", left + 14, y, { width: pageWidth - 14 });
  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Gap & Findings Report", left + 14, doc.y + 1, { width: pageWidth - 14 });
  doc
    .fillColor(INK_SOFT)
    .font("Helvetica")
    .fontSize(9.5)
    .text(`Generated from: ${source}`, left + 14, doc.y + 3, { width: pageWidth - 14 });
  y = Math.max(doc.y, y + 36) + 16;

  // Summary badges
  const summary: { text: string; swatch: Swatch }[] = [
    { text: `${confirmedClean} confirmed clean`, swatch: CONDITION_COLOR.Satisfactory },
    { text: `${needsAttention} need attention`, swatch: CONDITION_COLOR["Needs Repair"] },
    { text: `${notDocumented} not documented`, swatch: STATUS_COLOR.unchecked },
  ];
  let x = left;
  for (const s of summary) {
    const w = drawBadge(doc, s.text, x, y, s.swatch, 10);
    x += w + 8;
  }
  y += badgeHeight(10) + 18;

  // Section 1 — Needs Attention: documented items whose condition flags a
  // real finding (Needs Repair / Limitation), not a coverage gap.
  const attentionRooms = rooms
    .map((room) => ({
      location: room.location,
      items: room.requiredItems.filter(
        (name) => room.items[name]?.status === "confirmed" && isFlaggedCondition(room.items[name]?.condition)
      ),
      source: room.items,
    }))
    .filter((room) => room.items.length > 0);

  y = ensureSpace(doc, y, 40);
  y = sectionHeading(doc, "Needs Attention", left, y);

  if (attentionRooms.length === 0) {
    y = ensureSpace(doc, y, 20);
    doc
      .fillColor(INK_SOFT)
      .font("Helvetica-Oblique")
      .fontSize(10.5)
      .text("Nothing flagged — no documented item needs repair or has a limitation.", left, y, { width: pageWidth });
    y = doc.y + 6;
  } else {
    attentionRooms.forEach((room) => {
      y = ensureSpace(doc, y, 30);
      y = roomHeading(doc, room.location, left, y);
      for (const name of room.items) {
        y = ensureSpace(doc, y, 22);
        const condition = room.source[name]?.condition as "Needs Repair" | "Limitation";
        y = itemRow(doc, name, condition, CONDITION_COLOR[condition], left, y, right);
      }
      y += 6;
    });
  }

  y += 8;

  // Section 2 — Not Documented: the original coverage-gap scope.
  const gapRooms = rooms
    .map((room) => ({
      location: room.location,
      gaps: room.requiredItems.filter((name) => (room.items[name]?.status ?? "unchecked") !== "confirmed"),
      items: room.items,
    }))
    .filter((room) => room.gaps.length > 0);

  y = ensureSpace(doc, y, 40);
  y = sectionHeading(doc, "Not Documented", left, y);

  if (gapRooms.length === 0) {
    y = ensureSpace(doc, y, 20);
    doc
      .fillColor(INK_SOFT)
      .font("Helvetica-Oblique")
      .fontSize(10.5)
      .text("Every checklist item is documented. No coverage gaps to report.", left, y, { width: pageWidth });
  } else {
    gapRooms.forEach((room) => {
      y = ensureSpace(doc, y, 30);
      y = roomHeading(doc, room.location, left, y);
      for (const name of room.gaps) {
        y = ensureSpace(doc, y, 22);
        const status = (room.items[name]?.status ?? "unchecked") as Exclude<ItemStatus, "confirmed">;
        y = itemRow(doc, name, STATUS_LABELS[status], STATUS_COLOR[status], left, y, right);
      }
      y += 6;
    });
  }

  doc.end();
  return done;
}
