// src/app/api/feedback/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Minimal feedback endpoint (no DB writes yet).
 * Accepts arbitrary JSON and returns { ok: true } so the UI flow works.
 * If you want to persist feedback, tell me what fields you want stored and where.
 */

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user?.id as string) || null;

  // Accept any payload; swallow errors to avoid 500s
  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // You can log in dev to verify
  if (process.env.NODE_ENV !== "production") {
    console.warn("[feedback] user:", userId, "payload:", payload);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Health-check / simple ping
  return NextResponse.json({ ok: true });
}
