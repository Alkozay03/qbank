// src/app/api/reset-user-data/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use a transaction to ensure all operations complete or none do
    await prisma.$transaction(async (tx) => {
      // Delete all user responses
      await tx.response.deleteMany({
        where: { userId }
      });

      // Delete all user quiz items and their quizzes
      await tx.quizItem.deleteMany({
        where: { quiz: { userId } }
      });

      await tx.quiz.deleteMany({
        where: { userId }
      });

      // Reset all question modes for this user (marks, correct/incorrect status, etc.)
      // This removes all the user's question mode tracking (unused, correct, incorrect, omitted, marked)
      await tx.userQuestionMode.deleteMany({
        where: { userId }
      });

      console.error(`🔄 [RESET] Successfully reset data for user ${userId}:`, {
        deletedResponses: true,
        deletedQuizzes: true,
        deletedQuestionModes: true
      });
    });

    return NextResponse.json({
      success: true,
      message: "All user data has been reset successfully"
    });
  } catch (error) {
    console.error("Error resetting user data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}