import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { findSimilarQuestions } from "@/lib/similarity";

export const maxDuration = 10;

export async function GET() {
  console.error("🟢 [BATCH-MINIMAL] GET Function executed!");
  console.error("🟢 [BATCH-MINIMAL] Prisma imported successfully!");
  console.error("🟢 [BATCH-MINIMAL] findSimilarQuestions imported successfully!");
  return NextResponse.json({ 
    success: true, 
    message: "Minimal batch endpoint works with ALL imports (GET)!",
    hasPrisma: !!prisma,
    hasFindSimilar: typeof findSimilarQuestions === 'function'
  });
}

export async function POST() {
  console.error("🟢 [BATCH-MINIMAL] POST Function executed!");
  return NextResponse.json({ success: true, message: "Minimal batch endpoint works (POST)!" });
}
