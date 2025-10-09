// src/app/api/admin/questions/draft/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";

/**
 * POST /api/admin/questions/draft
 * Creates an empty draft question with just an ID so comments can be added
 */
export async function POST() {
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

  // Create a minimal draft question
  const question = await prisma.question.create({
    data: {
      text: "[Draft - Not yet saved]",
      explanation: "",
      objective: "",
      references: null,
      answers: {
        create: [
          { text: "Option A", isCorrect: false },
          { text: "Option B", isCorrect: false },
          { text: "Option C", isCorrect: false },
          { text: "Option D", isCorrect: false },
          { text: "Option E", isCorrect: false },
        ],
      },
    },
  });

  return NextResponse.json({ 
    ok: true, 
    questionId: question.id,
    customId: question.customId 
  });
}

/**
 * DELETE /api/admin/questions/draft/:id
 * Deletes a draft question (used when user cancels)
 */
export async function DELETE(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

  const url = new URL(req.url);
  const questionId = url.searchParams.get("id");

  if (!questionId) {
    return NextResponse.json({ error: "Question ID required" }, { status: 400 });
  }

  try {
    // Check if question exists and is a draft
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { text: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Only delete if it's still a draft (hasn't been saved with real content)
    if (question.text === "[Draft - Not yet saved]") {
      await prisma.question.delete({
        where: { id: questionId },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    // If it's been edited, don't delete it
    return NextResponse.json({ ok: true, deleted: false, message: "Question has been edited, not deleting" });
  } catch (error) {
    console.error("Error deleting draft question:", error);
    return NextResponse.json({ error: "Failed to delete draft question" }, { status: 500 });
  }
}
