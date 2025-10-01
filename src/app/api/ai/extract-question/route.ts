// src/app/api/ai/extract-question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

// helpers removed (server OCR disabled)

export async function POST() {
  // Server-side OCR is disabled by default to avoid bundling issues.
  // Client performs OCR and parsing; this endpoint can be wired to an external
  // detector service later (via EXTRACTOR_URL) if desired.
  return NextResponse.json({ error: "Server OCR disabled. Use client OCR or external EXTRACTOR_URL." }, { status: 501 });
}
