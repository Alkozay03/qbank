// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    return NextResponse.json(
      { ok: false, db: "down", error: message },
      { status: 500 }
    );
  }
}
