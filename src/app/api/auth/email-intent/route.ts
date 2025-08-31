// src/app/api/auth/email-intent/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // short-lived random marker
  const nonce = Math.random().toString(36).slice(2);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "email-intent",
    value: "1",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return res;
}
