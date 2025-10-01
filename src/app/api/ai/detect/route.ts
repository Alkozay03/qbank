// src/app/api/ai/detect/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

// DISABLED: This endpoint was causing massive bundle bloat due to Sharp dependency
// Sharp is 50MB+ and was being included in every page bundle
export async function POST() {
  return NextResponse.json({ 
    error: "AI detect endpoint disabled for performance. Use external AI service instead." 
  }, { status: 501 });
}

export async function GET() {
  return NextResponse.json({ 
    error: "AI detect endpoint disabled for performance. Use external AI service instead." 
  }, { status: 501 });
}
