// API endpoint for rotation period management (Admin/Master Admin only)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// GET /api/admin/rotation-periods
// Returns all rotation periods, optionally filtered by year
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN" && user.role !== "WEBSITE_CREATOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");

    // Fetch rotation periods
    const periods = await prisma.rotationPeriod.findMany({
      where: year ? { academicYear: parseInt(year) } : undefined,
      orderBy: [
        { academicYear: "desc" },
        { rotationNumber: "asc" },
        { rotationName: "asc" },
      ],
    });

    return NextResponse.json({ periods });
  } catch (error) {
    console.error("[rotation-periods/GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rotation periods" },
      { status: 500 }
    );
  }
}

// POST /api/admin/rotation-periods
// Create a new rotation period
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN" && user.role !== "WEBSITE_CREATOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { academicYear, rotationNumber, rotationName, startDate, endDate } = body;

    // Validation
    if (!academicYear || !rotationNumber || !rotationName || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["R1", "R2", "R3", "R4"].includes(rotationNumber)) {
      return NextResponse.json(
        { error: "Invalid rotation number. Must be R1, R2, R3, or R4" },
        { status: 400 }
      );
    }

    const validRotations = ["Pediatrics", "Internal Medicine", "General Surgery", "Obstetrics & Gynecology"];
    if (!validRotations.includes(rotationName)) {
      return NextResponse.json(
        { error: "Invalid rotation name" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Check for existing period with same key
    const existing = await prisma.rotationPeriod.findUnique({
      where: {
        academicYear_rotationNumber_rotationName: {
          academicYear,
          rotationNumber,
          rotationName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A rotation period with this combination already exists" },
        { status: 400 }
      );
    }

    // Create the period
    const period = await prisma.rotationPeriod.create({
      data: {
        academicYear,
        rotationNumber,
        rotationName,
        startDate: start,
        endDate: end,
        isActive: true,
      },
    });

    return NextResponse.json({ period });
  } catch (error) {
    console.error("[rotation-periods/POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create rotation period" },
      { status: 500 }
    );
  }
}
