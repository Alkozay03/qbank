// src/app/api/questions/[questionId]/comments/[commentId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, commentId } = await params;
    if (!questionId || !commentId) {
      return NextResponse.json({ error: "Question and comment ids are required" }, { status: 400 });
    }

    // Get user info to check role (use email like in POST method)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await prisma.questionComment.findUnique({
      where: { id: commentId },
      select: { id: true, questionId: true, createdById: true },
    });

    if (!comment || comment.questionId !== questionId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Allow deletion if user owns the comment OR if user is admin/master admin
    const isOwner = comment.createdById === user.id;
    const isAdmin = user.role === "ADMIN" || user.role === "MASTER_ADMIN";
    
    console.error("Delete comment debug:", {
      userEmail: session.user.email,
      userId: user.id,
      commentId,
      commentOwnerId: comment.createdById,
      userRole: user.role,
      isOwner,
      isAdmin,
      canDelete: isOwner || isAdmin
    });
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ 
        error: "Forbidden - You can only delete your own comments unless you are an admin",
        debug: { isOwner, isAdmin, userRole: user.role }
      }, { status: 403 });
    }

    await prisma.questionComment.delete({ where: { id: commentId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting comment", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
