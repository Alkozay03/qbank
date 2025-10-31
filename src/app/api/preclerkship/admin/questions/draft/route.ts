// src/app/api/preclerkship/admin/questions/draft/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";

/**
 * POST /api/preclerkship/admin/questions/draft
 * Creates an empty draft PreClerkship question with just an ID so comments can be added
 */
export async function POST(req: Request) {
  console.error("🔵 [PRECLERKSHIP DRAFT] POST request received");
  
  // Parse body to get yearLevel
  const body = await req.json();
  const yearLevel = body.yearLevel || 1;
  console.error("🔵 [PRECLERKSHIP DRAFT] Year level:", yearLevel);
  
  // Check permissions
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
  console.error("🟢 [PRECLERKSHIP DRAFT] Permission granted");

  // Create draft PreClerkship question (Prisma auto-generates IDs via @default(cuid()))
  const question = await prisma.preClerkshipQuestion.create({
    data: {
      yearLevel,
      text: "[Draft - Not yet saved]",
      explanation: "",
      objective: "",
      references: null,
      PreClerkshipAnswer: {
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

  console.error("🟢 [PRECLERKSHIP DRAFT] Question created:", question.id);
  return NextResponse.json({
    ok: true,
    questionId: question.id,
    customId: question.customId
  });
}

/**
 * DELETE /api/preclerkship/admin/questions/draft
 * Deletes a draft PreClerkship question (used when user cancels)
 */
export async function DELETE(req: Request) {
  try {
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const url = new URL(req.url);
    const questionId = url.searchParams.get("id");

    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    // Check if question exists and is a draft
    const question = await prisma.preClerkshipQuestion.findUnique({
      where: { id: questionId },
      select: { text: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Only delete if it's still a draft (hasn't been saved with real content)
    if (question.text === "[Draft - Not yet saved]" || question.text === "") {
      await prisma.preClerkshipQuestion.delete({
        where: { id: questionId },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    // If it's been edited, don't delete it
    return NextResponse.json({ ok: true, deleted: false, message: "Question has been edited, not deleting" });
  } catch (error) {
    console.error("[PRECLERKSHIP DRAFT DELETE] Error:", error);
    
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }
    
    return NextResponse.json({ error: "Failed to delete draft PreClerkship question" }, { status: 500 });
  }
}
