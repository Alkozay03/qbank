import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { removeQuestionFromSimilarityGroups } from "@/lib/similar-questions";

/**
 * POST /api/admin/similar-questions/keep
 * Body: { questionId: string }
 * Removes a question from similarity alert groups
 */
export async function POST(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

  const body = (await req.json()) as { questionId: string };

  if (!body?.questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  try {
    // Remove question from all similarity groups
    await removeQuestionFromSimilarityGroups(body.questionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error keeping question:", error);
    return NextResponse.json(
      { error: "Failed to keep question" },
      { status: 500 }
    );
  }
}
