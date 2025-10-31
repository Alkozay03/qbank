// src/app/api/preclerkship/admin/questions/draft/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { randomUUID } from "crypto";

/**
 * POST /api/preclerkship/admin/questions/draft
 * Creates an empty draft PreClerkship question with just an ID so comments can be added
 */
export async function POST(req: Request) {
  try {
    console.error("🔵 [PRECLERKSHIP DRAFT API] POST request received");
    console.error("🔵 [PRECLERKSHIP DRAFT API] Checking permissions...");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [PRECLERKSHIP DRAFT API] Permission granted:", userInfo);

    // Get yearLevel from request body
    const body = await req.json();
    const yearLevel = body.yearLevel || 1; // Default to Year 1

    console.error("🔵 [PRECLERKSHIP DRAFT API] Creating draft PreClerkship question for year:", yearLevel);
    
    // Create a minimal draft PreClerkship question
    const question = await prisma.preClerkshipQuestion.create({
      data: {
        id: randomUUID(),
        yearLevel,
        text: "[Draft - Not yet saved]",
        explanation: "",
        objective: "",
        references: null,
        PreClerkshipAnswer: {
          create: [
            { id: randomUUID(), text: "Option A", isCorrect: false },
            { id: randomUUID(), text: "Option B", isCorrect: false },
            { id: randomUUID(), text: "Option C", isCorrect: false },
            { id: randomUUID(), text: "Option D", isCorrect: false },
            { id: randomUUID(), text: "Option E", isCorrect: false },
          ],
        },
      },
    });

    console.error("🟢 [PRECLERKSHIP DRAFT API] Draft PreClerkship question created successfully:", {
      id: question.id,
      customId: question.customId,
      yearLevel: question.yearLevel,
      text: question.text
    });

    return NextResponse.json({ 
      ok: true, 
      questionId: question.id,
      customId: question.customId 
    });
  } catch (error) {
    console.error("🔴 [PRECLERKSHIP DRAFT API] Error creating draft question:", error);
    
    if (error instanceof Error) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error name:", error.name);
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error message:", error.message);
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error stack:", error.stack);
    }

    // Check if it's an RBAC error
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to create draft PreClerkship question" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/preclerkship/admin/questions/draft
 * Deletes a draft PreClerkship question (used when user cancels)
 */
export async function DELETE(req: Request) {
  try {
    console.error("🔵 [PRECLERKSHIP DRAFT DELETE] DELETE request received");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [PRECLERKSHIP DRAFT DELETE] Permission granted:", userInfo);

    const url = new URL(req.url);
    const questionId = url.searchParams.get("id");

    if (!questionId) {
      console.error("🔴 [PRECLERKSHIP DRAFT DELETE] No question ID provided");
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    console.error("🔵 [PRECLERKSHIP DRAFT DELETE] Attempting to delete PreClerkship question:", questionId);

    // Check if question exists and is a draft
    const question = await prisma.preClerkshipQuestion.findUnique({
      where: { id: questionId },
      select: { text: true },
    });

    if (!question) {
      console.error("🔴 [PRECLERKSHIP DRAFT DELETE] PreClerkship question not found:", questionId);
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Only delete if it's still a draft (hasn't been saved with real content)
    if (question.text === "[Draft - Not yet saved]" || question.text === "") {
      await prisma.preClerkshipQuestion.delete({
        where: { id: questionId },
      });
      console.error("🟢 [PRECLERKSHIP DRAFT DELETE] Draft deleted successfully:", questionId);
      return NextResponse.json({ ok: true, deleted: true });
    }

    // If it's been edited, don't delete it
    console.error("⚠️ [PRECLERKSHIP DRAFT DELETE] Question has been edited, not deleting:", questionId);
    return NextResponse.json({ ok: true, deleted: false, message: "Question has been edited, not deleting" });
  } catch (error) {
    console.error("🔴 [PRECLERKSHIP DRAFT DELETE] Error deleting draft PreClerkship question:", error);
    
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
