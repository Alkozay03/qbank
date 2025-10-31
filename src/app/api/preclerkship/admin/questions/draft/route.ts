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
    console.error("========================================");
    console.error("🔵 [PRECLERKSHIP DRAFT API] POST request received");
    console.error("🔵 [PRECLERKSHIP DRAFT API] Timestamp:", new Date().toISOString());
    console.error("🔵 [PRECLERKSHIP DRAFT API] Request URL:", req.url);
    console.error("🔵 [PRECLERKSHIP DRAFT API] Request method:", req.method);
    
    console.error("🔵 [PRECLERKSHIP DRAFT API] Step 1: Checking permissions...");
    let userInfo;
    try {
      userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
      console.error("🟢 [PRECLERKSHIP DRAFT API] Permission granted:", JSON.stringify(userInfo, null, 2));
    } catch (permError) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Permission check failed!");
      console.error("🔴 [PRECLERKSHIP DRAFT API] Permission error:", permError);
      throw permError;
    }

    console.error("🔵 [PRECLERKSHIP DRAFT API] Step 2: Parsing request body...");
    let body;
    try {
      body = await req.json();
      console.error("🟢 [PRECLERKSHIP DRAFT API] Body parsed:", JSON.stringify(body, null, 2));
    } catch (bodyError) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Failed to parse request body!");
      console.error("🔴 [PRECLERKSHIP DRAFT API] Body parse error:", bodyError);
      throw bodyError;
    }

    const yearLevel = body.yearLevel || 1;
    console.error("🔵 [PRECLERKSHIP DRAFT API] Year level:", yearLevel);

    console.error("🔵 [PRECLERKSHIP DRAFT API] Step 3: Checking Prisma client...");
    if (!prisma) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] CRITICAL: Prisma client is not initialized!");
      throw new Error("Database client not initialized");
    }
    console.error("🟢 [PRECLERKSHIP DRAFT API] Prisma client exists");

    console.error("🔵 [PRECLERKSHIP DRAFT API] Step 4: Testing database connection...");
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.error("🟢 [PRECLERKSHIP DRAFT API] Database connection successful");
    } catch (dbError) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Database connection failed!");
      console.error("🔴 [PRECLERKSHIP DRAFT API] DB connection error:", dbError);
      throw dbError;
    }

    console.error("🔵 [PRECLERKSHIP DRAFT API] Step 5: Generating UUIDs...");
    const questionId = randomUUID();
    const answerIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    console.error("🟢 [PRECLERKSHIP DRAFT API] Question ID:", questionId);
    console.error("🟢 [PRECLERKSHIP DRAFT API] Answer IDs:", answerIds);

    console.error("🔵 [PRECLERKSHIP DRAFT API] Step 6: Creating draft PreClerkship question...");
    console.error("🔵 [PRECLERKSHIP DRAFT API] Data to insert:", {
      id: questionId,
      yearLevel,
      text: "[Draft - Not yet saved]",
      explanation: "",
      objective: "",
      references: null,
      answerCount: 5
    });

    let question;
    try {
      question = await prisma.preClerkshipQuestion.create({
        data: {
          id: questionId,
          yearLevel,
          text: "[Draft - Not yet saved]",
          explanation: "",
          objective: "",
          references: null,
          PreClerkshipAnswer: {
            create: [
              { id: answerIds[0], text: "Option A", isCorrect: false },
              { id: answerIds[1], text: "Option B", isCorrect: false },
              { id: answerIds[2], text: "Option C", isCorrect: false },
              { id: answerIds[3], text: "Option D", isCorrect: false },
              { id: answerIds[4], text: "Option E", isCorrect: false },
            ],
          },
        },
      });
      console.error("🟢 [PRECLERKSHIP DRAFT API] Question created successfully!");
    } catch (createError) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Failed to create question in database!");
      console.error("🔴 [PRECLERKSHIP DRAFT API] Create error name:", createError instanceof Error ? createError.name : typeof createError);
      console.error("🔴 [PRECLERKSHIP DRAFT API] Create error message:", createError instanceof Error ? createError.message : String(createError));
      console.error("� [PRECLERKSHIP DRAFT API] Create error details:", createError);
      if (createError instanceof Error && createError.stack) {
        console.error("🔴 [PRECLERKSHIP DRAFT API] Create error stack:", createError.stack);
      }
      throw createError;
    }

    console.error("�🟢 [PRECLERKSHIP DRAFT API] Draft PreClerkship question created successfully:");
    console.error("🟢 [PRECLERKSHIP DRAFT API] Question details:", {
      id: question.id,
      customId: question.customId,
      yearLevel: question.yearLevel,
      text: question.text
    });
    console.error("========================================");

    return NextResponse.json({ 
      ok: true, 
      questionId: question.id,
      customId: question.customId 
    });
  } catch (error) {
    console.error("========================================");
    console.error("🔴🔴🔴 [PRECLERKSHIP DRAFT API] FATAL ERROR CAUGHT 🔴🔴🔴");
    console.error("🔴 [PRECLERKSHIP DRAFT API] Error timestamp:", new Date().toISOString());
    console.error("🔴 [PRECLERKSHIP DRAFT API] Error type:", typeof error);
    console.error("🔴 [PRECLERKSHIP DRAFT API] Error instanceof Error:", error instanceof Error);
    console.error("🔴 [PRECLERKSHIP DRAFT API] Full error object:", error);
    
    if (error instanceof Error) {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error name:", error.name);
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error message:", error.message);
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error stack:", error.stack);
      if ('cause' in error) {
        console.error("🔴 [PRECLERKSHIP DRAFT API] Error cause:", error.cause);
      }
    }

    // Log all error properties
    if (error && typeof error === 'object') {
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error properties:", Object.keys(error));
      console.error("🔴 [PRECLERKSHIP DRAFT API] Error JSON:", JSON.stringify(error, null, 2));
    }

    // Check if it's an RBAC error
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      console.error("🔴 [PRECLERKSHIP DRAFT API] HTTP error detected - status:", httpError.status, "message:", httpError.message);
      console.error("========================================");
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }

    console.error("========================================");
    return NextResponse.json(
      { 
        error: "Failed to create draft PreClerkship question",
        details: error instanceof Error ? error.message : String(error)
      },
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
