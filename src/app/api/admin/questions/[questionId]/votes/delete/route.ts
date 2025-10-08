import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * DELETE /api/admin/questions/[questionId]/votes/delete
 * Permanently delete all votes for a question
 * Admin/Master Admin only
 */
export async function DELETE(
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Permanently delete all votes for this question
    const result = await prisma.answerVote.deleteMany({
      where: { 
        questionId,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error deleting votes:", error);
    return NextResponse.json(
      { error: "Failed to delete votes" },
      { status: 500 }
    );
  }
}
