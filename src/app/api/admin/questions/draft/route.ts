// src/app/api/admin/questions/draft/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { randomUUID } from "node:crypto";

/**
 * POST /api/admin/questions/draft
 * Creates an empty draft question with just an ID so comments can be added
 */
export async function POST() {
  try {
    console.error("🔵 [DRAFT API] POST request received");
    console.error("🔵 [DRAFT API] Checking permissions...");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [DRAFT API] Permission granted:", userInfo);

    console.error("🔵 [DRAFT API] Creating draft question in database...");
    
    // Generate UUIDs
    const questionId = randomUUID();
    const choiceIds = [
      randomUUID(),
      randomUUID(),
      randomUUID(),
      randomUUID(),
      randomUUID()
    ];
    
    // Create a minimal draft question with IDs
    const question = await prisma.question.create({
      data: {
        id: questionId,
        text: "[Draft - Not yet saved]",
        explanation: "",
        objective: "",
        references: null,
        Choice: {
          create: [
            { id: choiceIds[0], text: "Option A", isCorrect: false },
            { id: choiceIds[1], text: "Option B", isCorrect: false },
            { id: choiceIds[2], text: "Option C", isCorrect: false },
            { id: choiceIds[3], text: "Option D", isCorrect: false },
            { id: choiceIds[4], text: "Option E", isCorrect: false },
          ],
        },
      },
    });

    console.error("🟢 [DRAFT API] Draft question created successfully:", {
      id: question.id,
      customId: question.customId,
      text: question.text
    });

    return NextResponse.json({ 
      ok: true, 
      questionId: question.id,
      customId: question.customId 
    });
  } catch (error) {
    console.error("🔴 [DRAFT API] Error creating draft question:", error);
    
    if (error instanceof Error) {
      console.error("🔴 [DRAFT API] Error name:", error.name);
      console.error("🔴 [DRAFT API] Error message:", error.message);
      console.error("🔴 [DRAFT API] Error stack:", error.stack);
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
      { error: "Failed to create draft question" },
      { status: 500 }
    );
  }
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
