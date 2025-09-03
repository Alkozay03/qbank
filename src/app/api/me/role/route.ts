// src/app/api/me/role/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * Returns the current user's role (from Prisma) and email.
 * 200 -> { email, role }
 * 401 -> not signed in
 * 404 -> user row not found
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
