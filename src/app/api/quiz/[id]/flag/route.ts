// src/app/api/quiz/[id]/flag/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizItemId, marked } = await req.json() as {
      quizItemId: string;
      marked: boolean;
    };

    if (!quizItemId || typeof marked !== 'boolean') {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { id } = await params; // Next.js 15: params is async

    // Verify that the quiz belongs to the user
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.userId !== userId) {
      return NextResponse.json({ error: "Not your quiz" }, { status: 403 });
    }

    // Update the quiz item's marked status
    const existingItem = await prisma.quizItem.findFirst({
      where: { id: quizItemId, quizId: id },
      select: { id: true, questionId: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Quiz item not found" }, { status: 404 });
    }

    const updatedItem = await prisma.quizItem.update({
      where: { id: quizItemId },
      data: { marked },
      select: { id: true, marked: true, questionId: true },
    });

    // Update the USER-SPECIFIC mode in the cached UserQuestionMode table
    try {
      if (marked) {
        // Setting marked = mode becomes "marked"
        await prisma.userQuestionMode.upsert({
          where: { userId_questionId: { userId, questionId: updatedItem.questionId } },
          update: { mode: "marked", updatedAt: new Date() },
          create: { userId, questionId: updatedItem.questionId, mode: "marked", updatedAt: new Date() },
        });
      } else {
        // Unmarking - derive mode from latest response
        const latestResponse = await prisma.response.findFirst({
          where: { userId, quizItem: { questionId: updatedItem.questionId } },
          orderBy: { createdAt: 'desc' },
          select: { choiceId: true, isCorrect: true }
        });
        
        let mode = "unused";
        if (latestResponse) {
          if (!latestResponse.choiceId) mode = "omitted";
          else if (latestResponse.isCorrect === true) mode = "correct";
          else if (latestResponse.isCorrect === false) mode = "incorrect";
          else mode = "omitted";
        }
        
        await prisma.userQuestionMode.upsert({
          where: { userId_questionId: { userId, questionId: updatedItem.questionId } },
          update: { mode, updatedAt: new Date() },
          create: { userId, questionId: updatedItem.questionId, mode, updatedAt: new Date() },
        });
      }
    } catch (modeError) {
      console.warn("Failed to update mode after flag toggle", updatedItem.questionId, modeError);
    }

    return NextResponse.json({
      success: true,
      quizItemId: updatedItem.id,
      marked: updatedItem.marked
    });
  } catch (error) {
    console.error("Error updating quiz item marked status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
