import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { checkForSimilarQuestions } from "@/lib/similar-questions";

/**
 * POST /api/admin/scan-similar-questions
 * 
 * Scans questions that are 1 day old for similarities with existing questions
 * This should be run daily as a cron job or manually triggered
 */
export async function POST() {
  try {
    console.warn("🔵 [SCAN SIMILAR] POST request received");
    
    // Require ADMIN, MASTER_ADMIN, or WEBSITE_CREATOR role
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.warn("🟢 [SCAN SIMILAR] Permission granted:", {
      email: userInfo.email,
      role: userInfo.role
    });

    // Get questions created exactly 1 day ago (24 hours ago to 23 hours ago window)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const twentyThreeHoursAgo = new Date();
    twentyThreeHoursAgo.setHours(twentyThreeHoursAgo.getHours() - 23);

    console.warn("🔍 [SCAN SIMILAR] Scanning questions created between:", {
      start: oneDayAgo.toISOString(),
      end: twentyThreeHoursAgo.toISOString()
    });

    // Get questions from both years that are 1 day old
    const questionsToScan = await prisma.question.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
          lte: twentyThreeHoursAgo,
        },
        text: { not: null },
        yearCaptured: { in: ["4", "5"] },
      },
      select: {
        id: true,
        text: true,
        customId: true,
        yearCaptured: true,
      },
    });

    console.warn(`🔍 [SCAN SIMILAR] Found ${questionsToScan.length} questions to scan`);

    if (questionsToScan.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No questions found from 1 day ago to scan",
        scanned: 0,
        similaritiesFound: 0,
      });
    }

    // Process each question
    let scannedCount = 0;
    let similaritiesFoundCount = 0;

    for (const question of questionsToScan) {
      const yearContext: "year4" | "year5" = question.yearCaptured === "5" ? "year5" : "year4";
      
      console.warn(`🔍 [SCAN SIMILAR] Scanning question ${question.customId} (${yearContext})`);
      
      try {
        await checkForSimilarQuestions(
          {
            id: question.id,
            text: question.text ?? "",
            customId: question.customId,
          },
          yearContext
        );
        
        scannedCount++;
        
        // Check if similarities were found by looking for groups containing this question
        const groups = await prisma.similarQuestionGroup.findMany({
          where: {
            questionIds: { has: question.id },
          },
        });
        
        if (groups.length > 0) {
          similaritiesFoundCount++;
          console.warn(`🟡 [SCAN SIMILAR] Found similarities for question ${question.customId}`);
        }
      } catch (error) {
        console.error(`🔴 [SCAN SIMILAR] Error scanning question ${question.customId}:`, error);
        // Continue with next question
      }
    }

    console.warn(`🟢 [SCAN SIMILAR] Scan complete:`, {
      scanned: scannedCount,
      similaritiesFound: similaritiesFoundCount,
    });

    return NextResponse.json({
      success: true,
      message: "Daily similarity scan completed",
      scanned: scannedCount,
      similaritiesFound: similaritiesFoundCount,
    });
  } catch (error) {
    console.error("🔴 [SCAN SIMILAR] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("🔴 [SCAN SIMILAR] Error details:", {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      {
        error: "Failed to scan for similar questions",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
