// src/app/api/profile/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      firstName: true,
      lastName: true,
      gradYear: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    const created = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        role: Role.MEMBER, // ✅ valid enum
      },
      select: {
        firstName: true,
        lastName: true,
        gradYear: true,
        email: true,
        role: true,
      },
    });
    return NextResponse.json(created);
  }

  return NextResponse.json(user);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const firstName = (form.get("firstName") || "") as string;
  const lastName = (form.get("lastName") || "") as string;
  const gradYearRaw = form.get("gradYear") as string | null;
  const gradYear = gradYearRaw ? Number(gradYearRaw) : null;

  const updated = await prisma.user.upsert({
    where: { email: session.user.email },
    update: { firstName, lastName, gradYear },
    create: {
      email: session.user.email,
      role: Role.MEMBER, // ✅ use enum, not string
      firstName,
      lastName,
      gradYear,
    },
    select: {
      firstName: true,
      lastName: true,
      gradYear: true,
      email: true,
      role: true,
    },
  });

  // Handle redirect vs JSON response
  const wantsRedirect = form.get("__redirect") === "1";
  const accepts = req.headers.get("accept") || "";
  const prefersJson = accepts.includes("application/json");

  if (wantsRedirect || !prefersJson) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  return NextResponse.json(updated);
}
