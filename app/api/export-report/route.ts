import { NextResponse } from "next/server";
import { renderEvidenceReportPdf } from "@/app/lib/evidenceReportPdf";
import type { EvidenceCheckItem } from "@/app/lib/types";

type ExportImage = { base64: string; analysis: EvidenceCheckItem };

// Re-lays out analysis already computed by /api/evidence-check as a PDF —
// never re-runs the vision model. No storage needed: the images have been
// sitting in the browser as base64 since upload, so this just formats data
// that's already in hand.
export async function POST(req: Request) {
  const body = await req.json();
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
