// src/app/api/questions/[questionId]/comments/route.ts
export const runtime = "nodejs";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

let cachedHasOriginColumn: boolean | null = null;

const MAX_COMMENT_LENGTH = 4000;
const MAX_AUTHOR_LENGTH = 120;

function mapPrismaError(error: unknown): { status: number; message: string } {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return { status: 422, message: "Comment payload is invalid." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return { status: 409, message: "A similar comment already exists." };
      case "P2003":
        return { status: 404, message: "Question not found or unavailable." };
      default:
        break;
    }
  }
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return { status: 503, message: "Comment service temporarily unavailable. Please try again." };
  }
  return { status: 500, message: "Failed to save comment" };
}

async function ensureOriginColumnPresence(): Promise<boolean> {
  if (cachedHasOriginColumn !== null) {
    return cachedHasOriginColumn;
  }
  try {
    const [{ exists }] = (await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'QuestionComment'
           AND column_name = 'origin'
       ) AS "exists"`
    )) ?? [{ exists: false }];
    if (!exists) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "QuestionComment" ADD COLUMN IF NOT EXISTS "origin" TEXT DEFAULT 'runner'`
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "QuestionComment" SET "origin" = 'runner' WHERE "origin" IS NULL`
        );
        cachedHasOriginColumn = true;
        return true;
      } catch (creationError) {
        console.warn("Unable to add QuestionComment.origin column", creationError);
        cachedHasOriginColumn = false;
        return false;
      }
    }
    cachedHasOriginColumn = Boolean(exists);
  } catch (error) {
    console.warn("Unable to verify QuestionComment.origin column", error);
    cachedHasOriginColumn = false;
  }
  return cachedHasOriginColumn;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ error: "Question id required" }, { status: 400 });
    }

    // Get sort parameter from query string (default: "recent")
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sort") || "recent";

    const hasOriginColumn = await ensureOriginColumnPresence();

    // Get current user for vote status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    // Fetch all comments (parent comments and replies)
    const allComments = await prisma.questionComment.findMany({
      where: { questionId },
      include: {
        User: {
          select: {
            role: true,
            email: true,
            gradYear: true,
          },
        },
        other_QuestionComment: {
          select: { id: true },
        },
        CommentVote: user ? {
          where: { userId: user.id },
          select: { id: true },
        } : false,
      },
    });

    // Separate parent comments and replies
    const parentComments = allComments.filter(c => !c.parentId);
    const repliesMap = new Map<string, typeof allComments>();
    
    allComments.filter(c => c.parentId).forEach(reply => {
      if (!repliesMap.has(reply.parentId!)) {
        repliesMap.set(reply.parentId!, []);
      }
      repliesMap.get(reply.parentId!)!.push(reply);
    });

    // Sort parent comments based on sortBy parameter
    const sortedParents = [...parentComments];
    switch (sortBy) {
      case "upvotes":
        sortedParents.sort((a, b) => b.upvoteCount - a.upvoteCount);
        break;
      case "popular":
        sortedParents.sort((a, b) => b.other_QuestionComment.length - a.other_QuestionComment.length);
        break;
      case "oldest":
        sortedParents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "recent":
      default:
        sortedParents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    // Map comments with their replies
    const commentsWithReplies = sortedParents.map((comment) => {
      const replies = repliesMap.get(comment.id) || [];
      // Sort replies oldest first
      replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return {
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        imageUrl: comment.imageUrl,
        origin: hasOriginColumn && "origin" in comment ? comment.origin ?? "runner" : (
          comment.User?.role === "Admin" || comment.User?.role === "MASTER_ADMIN"
            ? "editor"
            : "runner"
        ),
        createdAt: comment.createdAt,
        createdByRole: comment.User?.role ?? null,
        createdByEmail: comment.User?.email ?? null,
        createdByGradYear: comment.User?.gradYear ?? null,
        parentId: null,
        upvoteCount: comment.upvoteCount,
        replyCount: replies.length,
        hasVoted: user ? (comment.CommentVote && comment.CommentVote.length > 0) : false,
        replies: replies.map(reply => ({
          id: reply.id,
          authorName: reply.authorName,
          body: reply.body,
          imageUrl: reply.imageUrl,
          origin: hasOriginColumn && "origin" in reply ? reply.origin ?? "runner" : (
            reply.User?.role === "Admin" || reply.User?.role === "MASTER_ADMIN"
              ? "editor"
              : "runner"
          ),
          createdAt: reply.createdAt,
          createdByRole: reply.User?.role ?? null,
          createdByEmail: reply.User?.email ?? null,
          createdByGradYear: reply.User?.gradYear ?? null,
          parentId: reply.parentId,
        })),
      };
    });

    return NextResponse.json({ comments: commentsWithReplies });
  } catch (error) {
    console.error("Error loading question comments", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ error: "Question id required" }, { status: 400 });
    }

    const payload = (await req.json().catch(() => ({}))) as {
      text?: unknown;
      authorName?: unknown;
      imageUrl?: unknown;
      origin?: unknown;
      parentId?: unknown;
    };

    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
    const authorName = typeof payload.authorName === "string" ? payload.authorName.trim() : "";
    const requestedOrigin = payload.origin === "editor" ? "editor" : "runner";
    const parentId = typeof payload.parentId === "string" ? payload.parentId : null;

    if (!text && !imageUrl) {
      return NextResponse.json({ error: "A comment or image is required" }, { status: 400 });
    }

    if (text.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment is too long (max ${MAX_COMMENT_LENGTH} characters).` },
        { status: 422 }
      );
    }

    if (authorName.length > MAX_AUTHOR_LENGTH) {
      return NextResponse.json(
        { error: `Display name is too long (max ${MAX_AUTHOR_LENGTH} characters).` },
        { status: 422 }
      );
    }

  const isHttpUrl = /^https?:\/\//i.test(imageUrl);
  const isAllowedRelativeUrl = imageUrl.startsWith("/uploads/");
  const sanitizedImageUrl = isHttpUrl || isAllowedRelativeUrl ? imageUrl : "";

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Get the actual user from database to ensure valid createdById
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasOriginColumn = await ensureOriginColumnPresence();

    // If parentId is provided, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.questionComment.findUnique({
        where: { id: parentId },
        select: { id: true, questionId: true, parentId: true },
      });

      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }

      if (parentComment.questionId !== questionId) {
        return NextResponse.json({ error: "Parent comment belongs to different question" }, { status: 400 });
      }

      if (parentComment.parentId) {
        return NextResponse.json({ error: "Cannot reply to a reply (only one level deep)" }, { status: 400 });
      }
    }

    let comment;
    try {
      comment = await prisma.questionComment.create({
        data: {
          id: crypto.randomUUID(),
          questionId: question.id,
          body: text || "",
          imageUrl: sanitizedImageUrl || null,
          authorName: authorName || "Previous Batch",
          ...(hasOriginColumn ? { origin: requestedOrigin } : {}),
          createdById: user.id,
          parentId: parentId,
          updatedAt: new Date(),
        },
        include: {
          User: {
            select: {
              role: true,
              email: true,
              gradYear: true,
            },
          },
        },
      });
    } catch (creationError) {
      const { status, message } = mapPrismaError(creationError);
      console.error("Error creating question comment", creationError);
      return NextResponse.json({ error: message }, { status });
    }

    const responseOrigin = hasOriginColumn && "origin" in comment ? comment.origin ?? "runner" : requestedOrigin;

    // TypeScript type narrowing: include User relation
    const commentWithUser = comment as typeof comment & {
      User: { role: string; email: string; gradYear: number } | null;
    };

    return NextResponse.json(
      {
        comment: {
          id: commentWithUser.id,
          authorName: commentWithUser.authorName,
          body: commentWithUser.body,
          imageUrl: commentWithUser.imageUrl,
          origin: responseOrigin,
          createdAt: commentWithUser.createdAt,
          createdByRole: commentWithUser.User?.role ?? null,
          createdByEmail: commentWithUser.User?.email ?? null,
          createdByGradYear: commentWithUser.User?.gradYear ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating question comment", error);
    const { status, message } = mapPrismaError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
