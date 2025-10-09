import { NextResponse } from "next/server";

export const maxDuration = 10;

export async function POST() {
  console.error("🟢 [BATCH-MINIMAL] Function executed!");
  return NextResponse.json({ success: true, message: "Minimal batch endpoint works!" });
}
