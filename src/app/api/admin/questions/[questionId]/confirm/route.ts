// src/app/api/admin/questions/[questionId]/confirm/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function PATCH(
  req: NextRequest,
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

    // Get user role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN" && user.role !== "WEBSITE_CREATOR")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get the new confirmation status from request body
    const body = (await req.json().catch(() => ({}))) as {
      isAnswerConfirmed?: unknown;
    };

    if (typeof body.isAnswerConfirmed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request: isAnswerConfirmed must be a boolean" },
        { status: 400 }
      );
    }

    // Update the question
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { isAnswerConfirmed: body.isAnswerConfirmed },
      select: {
        id: true,
        isAnswerConfirmed: true,
        customId: true,
      },
    });

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating answer confirmation status", error);
    return NextResponse.json(
      { error: "Failed to update confirmation status" },
      { status: 500 }
    );
  }
}
