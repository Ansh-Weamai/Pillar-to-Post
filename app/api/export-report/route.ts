import { NextResponse } from "next/server";
import { renderEvidenceReportPdf, renderRoomWalkthroughReportPdf } from "@/app/lib/evidenceReportPdf";
import type { EvidenceCheckItem, RoomWalkthroughResult } from "@/app/lib/types";

type ExportImage = { base64: string; analysis: EvidenceCheckItem };

// Re-lays out analysis already computed by /api/evidence-check or
// /api/room-walkthrough-check as a PDF — never re-runs the vision model. No
// storage needed: the images have been sitting in the browser as base64
// since upload, so this just formats data that's already in hand. One route
// for both Feature 2 payload shapes rather than a second export endpoint.
export async function POST(req: Request) {
  const body = await req.json();
  const mode: "single" | "room" = body?.mode === "room" ? "room" : "single";

  if (mode === "room") {
    const images: string[] | undefined = body?.images;
    const result: RoomWalkthroughResult | undefined = body?.result;

    if (!Array.isArray(images) || images.length === 0 || !result) {
      return NextResponse.json({ error: "images and a result are required" }, { status: 400 });
    }

    const buffer = await renderRoomWalkthroughReportPdf(images, result);
    const bytes = new Uint8Array(buffer);
    return new NextResponse(new Blob([bytes], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=room-walkthrough-report.pdf",
      },
    });
  }

  const images: ExportImage[] | undefined = body?.images;

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "at least one image is required" }, { status: 400 });
  }

  const buffer = await renderEvidenceReportPdf(images);
  const bytes = new Uint8Array(buffer);

  return new NextResponse(new Blob([bytes], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=evidence-consistency-report.pdf",
    },
  });
}
