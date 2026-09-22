import PDFDocument from "pdfkit";
import { STATUS_LABELS } from "@/app/lib/itemStatus";
import type { ItemCondition, ItemStatus } from "@/app/lib/types";

const INK = "#0a0a0a";
const INK_SOFT = "#4b4b4b";
const LINE = "#e4e4e1";
const MISSING = "#c6221b";
const PARTIAL = "#c97a0a";

const STATUS_COLOR: Record<Exclude<ItemStatus, "confirmed">, string> = {
  unchecked: INK_SOFT,
  partial: PARTIAL,
  missing: MISSING,
};

const NEEDS_ATTENTION_COLOR: Record<"Needs Repair" | "Limitation", string> = {
  "Needs Repair": MISSING,
  Limitation: PARTIAL,
};

export type GapReportRoom = {
  location: string;
  requiredItems: string[];
  items: Record<string, { status: ItemStatus; condition?: ItemCondition }>;
};

function isFlaggedCondition(condition: ItemCondition | undefined): condition is "Needs Repair" | "Limitation" {
  return condition === "Needs Repair" || condition === "Limitation";
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

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

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

  doc.fontSize(18).fillColor(INK).text("PTP360 Second-Pass QA — Gap & Findings Report");
  doc.fontSize(10).fillColor(INK_SOFT).text(`Generated from: ${source}`);
  doc.moveDown(0.4);
  doc
    .fontSize(11)
    .fillColor(INK)
    .text(`${confirmedClean} confirmed clean · ${needsAttention} need attention · ${notDocumented} not documented`);
  doc.moveDown(1);

  function drawDivider() {
    doc.moveDown(0.4);
    doc
      .strokeColor(LINE)
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .stroke();
  }

  function drawSectionHeading(title: string) {
    doc.fontSize(13).fillColor(INK).text(title, { underline: true });
    doc.moveDown(0.4);
  }

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

  drawSectionHeading("Needs Attention");
  if (attentionRooms.length === 0) {
    doc.fontSize(11).fillColor(INK_SOFT).text("Nothing flagged — no documented item needs repair or has a limitation.");
  } else {
    attentionRooms.forEach((room, i) => {
      if (i > 0) doc.moveDown(0.5);
      doc.fontSize(12).fillColor(INK).text(room.location);
      doc.moveDown(0.2);
      for (const name of room.items) {
        const condition = room.source[name]?.condition as "Needs Repair" | "Limitation";
        doc
          .fontSize(10.5)
          .fillColor(INK)
          .text(`   ${name}`, { continued: true })
          .fillColor(NEEDS_ATTENTION_COLOR[condition])
          .text(`  —  ${condition}`);
      }
    });
  }

  doc.moveDown(0.8);
  drawSectionHeading("Not Documented");

  // Section 2 — Not Documented: the original coverage-gap scope.
  const gapRooms = rooms
    .map((room) => ({
      location: room.location,
      gaps: room.requiredItems.filter((name) => (room.items[name]?.status ?? "unchecked") !== "confirmed"),
      items: room.items,
    }))
    .filter((room) => room.gaps.length > 0);

  if (gapRooms.length === 0) {
    doc.fontSize(11).fillColor(INK_SOFT).text("Every checklist item is documented. No coverage gaps to report.");
  } else {
    gapRooms.forEach((room, i) => {
      if (i > 0) doc.moveDown(0.5);
      doc.fontSize(12).fillColor(INK).text(room.location);
      doc.moveDown(0.2);
      for (const name of room.gaps) {
        const status = (room.items[name]?.status ?? "unchecked") as Exclude<ItemStatus, "confirmed">;
        doc
          .fontSize(10.5)
          .fillColor(INK)
          .text(`   ${name}`, { continued: true })
          .fillColor(STATUS_COLOR[status])
          .text(`  —  ${STATUS_LABELS[status]}`);
      }
    });
  }

  drawDivider();

  doc.end();
  return done;
}
