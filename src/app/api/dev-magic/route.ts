// src/app/api/dev-magic/route.ts
import { NextResponse } from "next/server";

export function GET() {
  const payload = global.__DEV_MAGIC__ || null;
  return NextResponse.json(payload ?? {}, { status: 200 });
}
