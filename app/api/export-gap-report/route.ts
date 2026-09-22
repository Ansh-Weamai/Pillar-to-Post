import { NextResponse } from "next/server";
import { renderGapReportPdf, type GapReportRoom } from "@/app/lib/gapReportPdf";

// Re-lays out results already sitting in the Coverage Check page's state as
// a PDF — never re-runs a check. No Gemini/vision-model call happens here.
export async function POST(req: Request) {
  const body = await req.json();
  const rooms: GapReportRoom[] | undefined = body?.rooms;
  const source: string | undefined = body?.source;

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return NextResponse.json({ error: "at least one room is required" }, { status: 400 });
  }

  const buffer = await renderGapReportPdf(rooms, source ?? "No checks run yet");
  const bytes = new Uint8Array(buffer);

  return new NextResponse(new Blob([bytes], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=ptp360-gap-report.pdf",
    },
  });
}
