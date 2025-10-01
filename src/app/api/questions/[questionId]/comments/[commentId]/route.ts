// src/app/api/questions/[questionId]/comments/[commentId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { questionId: string; commentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const { questionId, commentId } = params;
    if (!questionId || !commentId) {
      return NextResponse.json({ error: "Question and comment ids are required" }, { status: 400 });
    }

    const comment = await prisma.questionComment.findUnique({
      where: { id: commentId },
      select: { id: true, questionId: true, createdById: true },
    });

    if (!comment || comment.questionId !== questionId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.questionComment.delete({ where: { id: commentId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting comment", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
