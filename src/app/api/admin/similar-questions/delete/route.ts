import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { removeQuestionFromSimilarityGroups } from "@/lib/similar-questions";

/**
 * DELETE /api/admin/similar-questions/delete
 * Body: { questionId: string }
 * Deletes a question from the database and removes it from similarity groups
 */
export async function DELETE(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

  const body = (await req.json()) as { questionId: string };

  if (!body?.questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  try {
    // First, remove from similarity groups
    await removeQuestionFromSimilarityGroups(body.questionId);

    // Then delete the question (cascade will delete answers, tags, etc.)
    await prisma.question.delete({
      where: { id: body.questionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
