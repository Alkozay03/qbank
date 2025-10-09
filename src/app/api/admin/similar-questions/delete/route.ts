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
  try {
    console.warn("🔵 [DELETE SIMILAR] DELETE request received");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.warn("🟢 [DELETE SIMILAR] Permission granted:", userInfo.email);

    const body = (await req.json()) as { questionId: string };
    console.warn("🔍 [DELETE SIMILAR] Request body:", body);

    if (!body?.questionId) {
      console.error("🔴 [DELETE SIMILAR] Missing questionId");
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    console.warn("🔵 [DELETE SIMILAR] Removing question from similarity groups:", body.questionId);
    
    // First, remove from similarity groups
    await removeQuestionFromSimilarityGroups(body.questionId);

    console.warn("🔵 [DELETE SIMILAR] Deleting question from database:", body.questionId);
    
    // Then delete the question (cascade will delete answers, tags, etc.)
    await prisma.question.delete({
      where: { id: body.questionId },
    });

    console.warn("🟢 [DELETE SIMILAR] Question deleted successfully:", body.questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔴 [DELETE SIMILAR] Error deleting question:", error);
    console.error("🔴 [DELETE SIMILAR] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: "Failed to delete question",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
