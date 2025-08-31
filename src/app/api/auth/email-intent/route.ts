// src/app/api/auth/email-intent/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  // short-lived random marker
  const nonce = Math.random().toString(36).slice(2);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("email-intent", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });
  return res;
}
