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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ error: "Question id required" }, { status: 400 });
    }

    const hasOriginColumn = await ensureOriginColumnPresence();

    if (hasOriginColumn) {
      const comments = await prisma.questionComment.findMany({
        where: { questionId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          authorName: true,
          body: true,
          imageUrl: true,
          origin: true,
          createdAt: true,
          createdBy: {
            select: {
              role: true,
              email: true,
              gradYear: true,
            },
          },
        },
      });

      return NextResponse.json({
        comments: comments.map((comment) => ({
          id: comment.id,
          authorName: comment.authorName,
          body: comment.body,
          imageUrl: comment.imageUrl,
          origin: comment.origin ?? "runner",
          createdAt: comment.createdAt,
          createdByRole: comment.createdBy?.role ?? null,
          createdByEmail: comment.createdBy?.email ?? null,
          createdByGradYear: comment.createdBy?.gradYear ?? null,
        })),
      });
    }

    const comments = await prisma.questionComment.findMany({
      where: { questionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorName: true,
        body: true,
        imageUrl: true,
        createdAt: true,
        createdBy: {
          select: {
            role: true,
            email: true,
            gradYear: true,
          },
        },
      },
    });

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        imageUrl: comment.imageUrl,
        origin:
          comment.createdBy?.role === "ADMIN" || comment.createdBy?.role === "MASTER_ADMIN"
            ? "editor"
            : "runner",
        createdAt: comment.createdAt,
        createdByRole: comment.createdBy?.role ?? null,
        createdByEmail: comment.createdBy?.email ?? null,
        createdByGradYear: comment.createdBy?.gradYear ?? null,
      })),
    });
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
    };

    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
    const authorName = typeof payload.authorName === "string" ? payload.authorName.trim() : "";
    const requestedOrigin = payload.origin === "editor" ? "editor" : "runner";

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

    let comment;
    try {
      comment = await prisma.questionComment.create({
        data: {
          questionId: question.id,
          body: text || "",
          imageUrl: sanitizedImageUrl || null,
          authorName: authorName || "Previous Batch",
          ...(hasOriginColumn ? { origin: requestedOrigin } : {}),
          createdById: user.id,
        },
        include: {
          createdBy: {
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

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          authorName: comment.authorName,
          body: comment.body,
          imageUrl: comment.imageUrl,
          origin: responseOrigin,
          createdAt: comment.createdAt,
          createdByRole: comment.createdBy?.role ?? null,
          createdByEmail: comment.createdBy?.email ?? null,
          createdByGradYear: comment.createdBy?.gradYear ?? null,
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
