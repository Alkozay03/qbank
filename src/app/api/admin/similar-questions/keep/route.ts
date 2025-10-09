import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { removeQuestionFromSimilarityGroups } from "@/lib/similar-questions";

/**
 * POST /api/admin/similar-questions/keep
 * Body: { questionId: string }
 * Removes a question from similarity alert groups
 */
export async function POST(req: Request) {
  try {
    console.warn("🔵 [KEEP SIMILAR] POST request received");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.warn("🟢 [KEEP SIMILAR] Permission granted:", userInfo.email);

    const body = (await req.json()) as { questionId: string };
    console.warn("🔍 [KEEP SIMILAR] Request body:", body);

    if (!body?.questionId) {
      console.error("🔴 [KEEP SIMILAR] Missing questionId");
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    console.warn("🔵 [KEEP SIMILAR] Removing question from similarity groups:", body.questionId);
    
    // Remove question from all similarity groups
    await removeQuestionFromSimilarityGroups(body.questionId);

    console.warn("🟢 [KEEP SIMILAR] Question kept successfully:", body.questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔴 [KEEP SIMILAR] Error keeping question:", error);
    console.error("🔴 [KEEP SIMILAR] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: "Failed to keep question",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
