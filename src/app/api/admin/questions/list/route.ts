// src/app/api/admin/questions/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";

/**
 * POST /api/admin/questions/list
 * Body: { yearCaptured: string[], startDate: string, endDate: string }
 * Returns a list of questions matching the criteria
 */
export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const body = (await req.json()) as {
      yearCaptured: string[];
      startDate: string;
      endDate: string;
    };

    if (!Array.isArray(body.yearCaptured) || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "yearCaptured, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const questions = await prisma.question.findMany({
      where: {
        yearCaptured: { in: body.yearCaptured },
        createdAt: {
          gte: new Date(body.startDate),
          lte: new Date(body.endDate),
        },
      },
      select: {
        id: true,
        customId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
