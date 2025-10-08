// src/app/api/questions/[questionId]/comments/[commentId]/vote/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function POST(
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
      return NextResponse.json({ error: "Question id and comment id required" }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify comment exists and belongs to the question
    const comment = await prisma.questionComment.findUnique({
      where: { id: commentId },
      select: { id: true, questionId: true, parentId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.questionId !== questionId) {
      return NextResponse.json({ error: "Comment belongs to different question" }, { status: 400 });
    }

    if (comment.parentId) {
      return NextResponse.json({ error: "Cannot vote on replies, only parent comments" }, { status: 400 });
    }

    // Check if user already voted
    const existingVote = await prisma.commentVote.findUnique({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId: commentId,
        },
      },
    });

    if (existingVote) {
      // Remove vote (toggle off)
      await prisma.$transaction([
        prisma.commentVote.delete({
          where: { id: existingVote.id },
        }),
        prisma.questionComment.update({
          where: { id: commentId },
          data: {
            upvoteCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const updatedComment = await prisma.questionComment.findUnique({
        where: { id: commentId },
        select: { upvoteCount: true },
      });

      return NextResponse.json({
        voted: false,
        upvoteCount: updatedComment?.upvoteCount ?? 0,
      });
    } else {
      // Add vote
      await prisma.$transaction([
        prisma.commentVote.create({
          data: {
            userId: user.id,
            commentId: commentId,
          },
        }),
        prisma.questionComment.update({
          where: { id: commentId },
          data: {
            upvoteCount: {
              increment: 1,
            },
          },
        }),
      ]);

      const updatedComment = await prisma.questionComment.findUnique({
        where: { id: commentId },
        select: { upvoteCount: true },
      });

      return NextResponse.json({
        voted: true,
        upvoteCount: updatedComment?.upvoteCount ?? 1,
      });
    }
  } catch (error) {
    console.error("Error toggling comment vote", error);
    return NextResponse.json({ error: "Failed to toggle vote" }, { status: 500 });
  }
}
