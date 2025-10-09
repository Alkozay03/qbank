import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const maxDuration = 10;

export async function GET() {
  console.error("🟢 [BATCH-MINIMAL] GET Function executed!");
  console.error("🟢 [BATCH-MINIMAL] Prisma imported successfully!");
  return NextResponse.json({ 
    success: true, 
    message: "Minimal batch endpoint works with Prisma import (GET)!",
    hasPrisma: !!prisma 
  });
}

export async function POST() {
  console.error("🟢 [BATCH-MINIMAL] POST Function executed!");
  return NextResponse.json({ success: true, message: "Minimal batch endpoint works (POST)!" });
}
