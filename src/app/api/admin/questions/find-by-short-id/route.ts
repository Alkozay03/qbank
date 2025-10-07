import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

/**
 * Find questions by short ID prefix
 * Allows admins to quickly locate questions when users report issues
 * Requires minimum 6 characters to avoid too many matches
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Get short ID from query params
    const { searchParams } = new URL(request.url);
    const shortId = searchParams.get("id");

    if (!shortId) {
      return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
    }

    if (shortId.length < 6) {
      return NextResponse.json(
        { error: "ID must be at least 6 characters to avoid too many matches" },
        { status: 400 }
      );
    }

    // Find questions that start with the short ID
    const questions = await prisma.question.findMany({
      where: {
        id: {
          startsWith: shortId,
        },
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        updatedAt: true,
        occurrences: {
          select: {
            year: true,
            rotation: true,
          },
        },
      },
      take: 10, // Limit to 10 results
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      count: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        shortId: q.id.substring(0, 8),
        questionText: (q.text || "No text").substring(0, 100) + ((q.text?.length || 0) > 100 ? "..." : ""),
        years: [...new Set(q.occurrences.map((o) => o.year).filter(Boolean))],
        rotations: [...new Set(q.occurrences.map((o) => o.rotation).filter(Boolean))],
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error finding question by short ID:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
