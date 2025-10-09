import { NextResponse } from "next/server";

export async function GET() {
  console.error("🧪 [TEST] Simple test endpoint called!");
  return NextResponse.json({ message: "Test successful!" });
}

export async function POST() {
  console.error("🧪 [TEST] POST test endpoint called!");
  return NextResponse.json({ message: "POST test successful!" });
}
