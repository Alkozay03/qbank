export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { isAnyAdmin } from "@/lib/website-creator";
import SimilarQuestionsClient from "./client";

export default async function SimilarQuestionsPage() {
  const session = await auth();
  const email = session?.user?.email;
  
  if (!email) {
    redirect("/login");
  }

  // Check if user has admin privileges
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!user || !isAnyAdmin(user.role)) {
    redirect("/year5");
  }

  // Get all similar question groups for year5
  const similarGroups = await prisma.similarQuestionGroup.findMany({
    where: {
      yearContext: "year5",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch full question details for all questions in groups
  const allQuestionIds = similarGroups.flatMap((group) => group.questionIds);
  
  const questions = await prisma.question.findMany({
    where: {
      id: { in: allQuestionIds },
    },
    include: {
      answers: true,
      questionTags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // Create a map for easy lookup
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Transform groups to include full question data
  const groupsWithQuestions = similarGroups.map((group) => ({
    id: group.id,
    createdAt: group.createdAt,
    similarityScores: group.similarityScores as Record<string, number>,
    questions: group.questionIds
      .map((id) => questionMap.get(id))
      .filter((q) => q !== undefined),
  }));

  return <SimilarQuestionsClient groups={groupsWithQuestions} yearContext="year5" />;
}
