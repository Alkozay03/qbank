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

  // Create a minimal draft question (Prisma auto-generates IDs via @default(cuid()))
  const question = await prisma.question.create({
    data: {
      text: "[Draft - Not yet saved]",
      explanation: "",
      objective: "",
      references: null,
      Choice: {
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
  try {
    console.error("🔵 [DRAFT DELETE] DELETE request received");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [DRAFT DELETE] Permission granted:", userInfo);

    const url = new URL(req.url);
    const questionId = url.searchParams.get("id");

    if (!questionId) {
      console.error("🔴 [DRAFT DELETE] No question ID provided");
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    console.error("🔵 [DRAFT DELETE] Attempting to delete question:", questionId);

    // Check if question exists and is a draft
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { text: true },
    });

    if (!question) {
      console.error("🔴 [DRAFT DELETE] Question not found:", questionId);
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Only delete if it's still a draft (hasn't been saved with real content)
    if (question.text === "[Draft - Not yet saved]" || question.text === "") {
      await prisma.question.delete({
        where: { id: questionId },
      });
      console.error("🟢 [DRAFT DELETE] Draft deleted successfully:", questionId);
      return NextResponse.json({ ok: true, deleted: true });
    }

    // If it's been edited, don't delete it
    console.error("⚠️ [DRAFT DELETE] Question has been edited, not deleting:", questionId);
    return NextResponse.json({ ok: true, deleted: false, message: "Question has been edited, not deleting" });
  } catch (error) {
    console.error("🔴 [DRAFT DELETE] Error deleting draft question:", error);
    
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }
    
    return NextResponse.json({ error: "Failed to delete draft question" }, { status: 500 });
  }
}
