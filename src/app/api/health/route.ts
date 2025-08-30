// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, db: "down", error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
