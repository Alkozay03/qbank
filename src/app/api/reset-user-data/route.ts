// src/app/api/reset-user-data/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

export async function POST(_req: NextRequest) {
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

      // Reset all marked flags for questions this user has interacted with
      // (We can't easily track which specific questions were marked by this user,
      // so we'll reset all quiz items that belonged to this user)
      // Since we already deleted them above, no additional action needed for marked flags
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