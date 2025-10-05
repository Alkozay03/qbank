// src/app/api/profile/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Role } from "@prisma/client";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/server/db/errors";
import { revalidatePath } from "next/cache";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        firstName: true,
        lastName: true,
        gradYear: true,
        email: true,
        role: true,
        timezone: true,
        rotation: true,
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
          timezone: true,
          rotation: true,
          theme: true,
        },
      });
      return NextResponse.json(created);
    }

    return NextResponse.json(user);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn("[profile] Database unavailable", error);
      return databaseUnavailableResponse();
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const firstNameRaw = form.get("firstName") as string | null;
  const lastNameRaw = form.get("lastName") as string | null;
  const firstName = firstNameRaw?.trim() || null;
  const lastName = lastNameRaw?.trim() || null;
  const gradYearRaw = form.get("gradYear") as string | null;
  const gradYear = gradYearRaw ? Number(gradYearRaw) : null;
  const timezone = (form.get("timezone") || null) as string | null;
  const rotation = (form.get("rotation") || null) as string | null;
  const theme = (form.get("theme") || null) as string | null;

  let updated;
  try {
    updated = await prisma.user.upsert({
      where: { email: session.user.email },
      update: { firstName, lastName, gradYear, timezone, rotation, theme },
      create: {
        email: session.user.email,
        role: Role.MEMBER, // ✅ use enum, not string
        firstName,
        lastName,
        gradYear,
        timezone,
        rotation,
        theme,
      },
      select: {
        firstName: true,
        lastName: true,
        gradYear: true,
        email: true,
        role: true,
        timezone: true,
        rotation: true,
        theme: true,
      },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn("[profile] Database unavailable on update", error);
      return databaseUnavailableResponse();
    }
    throw error;
  }

  // Revalidate the dashboard page to ensure fresh data
  try {
    revalidatePath("/year4");
    revalidatePath("/profile");
  } catch (error) {
    console.warn("[profile] Failed to revalidate paths", error);
  }

  // Handle redirect vs JSON response
  const wantsRedirect = form.get("__redirect") === "1";
  const accepts = req.headers.get("accept") || "";
  const prefersJson = accepts.includes("application/json");

  if (wantsRedirect || !prefersJson) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  return NextResponse.json(updated);
}
