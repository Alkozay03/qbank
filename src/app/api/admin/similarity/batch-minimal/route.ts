import { NextResponse } from "next/server";

export const maxDuration = 10;

export async function GET() {
  console.error("🟢 [BATCH-MINIMAL] GET Function executed!");
  return NextResponse.json({ success: true, message: "Minimal batch endpoint works (GET)!" });
}

export async function POST() {
  console.error("🟢 [BATCH-MINIMAL] POST Function executed!");
  return NextResponse.json({ success: true, message: "Minimal batch endpoint works (POST)!" });
}
