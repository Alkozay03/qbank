import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AI_EXTRACTOR_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_AI_EXTRACTOR === "true" ||
  process.env.ENABLE_AI_EXTRACTOR === "true";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadImplementation() {
  return import("../../../archive/api/ai-extract/route.impl");
}

export async function POST(request: NextRequest) {
  if (!AI_EXTRACTOR_ENABLED) {
    return NextResponse.json(
      {
        error: "AI question extractor is disabled",
        enableHint: "Set ENABLE_AI_EXTRACTOR=true in your environment to re-enable the endpoint.",
      },
      { status: 503 }
    );
  }

  const { POST } = await loadImplementation();
  return POST(request);
}

export async function GET() {
  if (!AI_EXTRACTOR_ENABLED) {
    return NextResponse.json({
      status: "disabled",
      message: "AI extraction runtime has been archived for faster local development.",
      enableHint: "Set ENABLE_AI_EXTRACTOR=true to restore health checks.",
      timestamp: new Date().toISOString(),
    });
  }

  const { GET } = await loadImplementation();
  return GET();
}
