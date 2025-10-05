import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "AI question extractor is disabled",
      enableHint: "This feature is currently disabled for build compatibility.",
    },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "AI question extractor is disabled", 
      enableHint: "This feature is currently disabled for build compatibility.",
    },
    { status: 503 }
  );
}
