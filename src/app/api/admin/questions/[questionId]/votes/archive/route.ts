import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * POST /api/admin/questions/[questionId]/votes/archive
 * Archive all votes for a question (set isArchived = true)
 * Admin/Master Admin only
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    // Verify admin access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN" && user.role !== "WEBSITE_CREATOR")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Archive all votes for this question
    const result = await prisma.answerVote.updateMany({
      where: { 
        questionId,
        isArchived: false, // Only archive non-archived votes
      },
      data: { 
        isArchived: true,
      },
    });

    return NextResponse.json({
      success: true,
      archivedCount: result.count,
    });
  } catch (error) {
    console.error("Error archiving votes:", error);
    return NextResponse.json(
      { error: "Failed to archive votes" },
      { status: 500 }
    );
  }
}
