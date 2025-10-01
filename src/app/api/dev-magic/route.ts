// src/app/api/dev-magic/route.ts
import { NextResponse } from "next/server";
import { getDevMagic } from "@/lib/dev-magic";

export function GET() {
  const payload = getDevMagic();
  return NextResponse.json(payload ?? {}, { status: 200 });
}
