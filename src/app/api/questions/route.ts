import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";
import { canonicalizeQuestionMode, setQuestionMode } from "@/lib/quiz/questionMode";

type Answer = {
  text: string;
  isCorrect: boolean;
};

type Tag = {
  type: TagType;
  value: string;
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { text, explanation, objective, answers, tags }: {
      text: string;
      explanation?: string;
      objective?: string;
      answers: Answer[];
      tags?: Tag[];
    } = body;

    // Validate required fields
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 });
    }

    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "At least one answer is required" }, { status: 400 });
    }

    const validAnswers = answers.filter((a: Answer) => a.text && a.text.trim());
    if (validAnswers.length === 0) {
      return NextResponse.json({ error: "At least one answer with text is required" }, { status: 400 });
    }

    const correctAnswers = validAnswers.filter((a: Answer) => a.isCorrect);
    if (correctAnswers.length === 0) {
      return NextResponse.json({ error: "At least one correct answer is required" }, { status: 400 });
    }

    // Create the question (single statement with nested answers). No long interactive transaction.
    const question = await prisma.question.create({
      data: {
        text: text.trim(),
        explanation: (explanation?.trim() || ""),
        objective: (objective?.trim() || ""),
        answers: {
          create: validAnswers.map((answer: Answer) => ({
            text: answer.text.trim(),
            isCorrect: Boolean(answer.isCorrect),
          })),
        },
      },
      select: { id: true },
    });

    // Upsert tags and link outside of a transaction to avoid interactive transaction timeouts
    let providedMode: string | null = null;
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagIds: string[] = [];
      for (const tag of tags) {
        if (!tag?.type || !tag?.value) continue;
        if (tag.type === TagType.MODE) {
          providedMode = tag.value;
          continue;
        }
        try {
          const tagRecord = await prisma.tag.upsert({
            where: { type_value: { type: tag.type, value: tag.value } },
            update: {},
            create: { type: tag.type, value: tag.value },
            select: { id: true },
          });
          tagIds.push(tagRecord.id);
        } catch {
          // Handle race on unique constraint gracefully by fetching existing
          const existing = await prisma.tag.findUnique({
            where: { type_value: { type: tag.type, value: tag.value } },
            select: { id: true },
          });
          if (existing) tagIds.push(existing.id);
        }
      }
      if (tagIds.length) {
        const data = tagIds.map((tagId) => ({ questionId: question.id, tagId }));
        await prisma.questionTag.createMany({ data, skipDuplicates: true });
      }
    }

    const normalizedMode = canonicalizeQuestionMode(providedMode) ?? "unused";
    await setQuestionMode(question.id, normalizedMode);

    return NextResponse.json({ success: true, questionId: question.id, message: "Question created successfully" });

  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
