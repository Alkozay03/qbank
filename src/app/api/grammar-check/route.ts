import { NextResponse, type NextRequest } from "next/server";

const AI_EXTRACTOR_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_AI_EXTRACTOR === "true" ||
  process.env.ENABLE_AI_EXTRACTOR === "true";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadImplementation() {
  return import("../../../archive/api/grammar-check/route.impl");
}

export async function POST(request: NextRequest) {
  if (!AI_EXTRACTOR_ENABLED) {
    return NextResponse.json(
      {
        error: "Grammar check pipeline disabled",
        archived: true,
        enableHint: "Set ENABLE_AI_EXTRACTOR=true in your environment to re-enable grammar checks.",
      },
      { status: 503 }
    );
  }

  const { POST: runGrammarCheck } = await loadImplementation();
  return runGrammarCheck(request);
}
