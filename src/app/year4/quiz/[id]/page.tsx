// src/app/year4/quiz/[id]/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import QuizRunner from "../_components/QuizRunner";

type QuizStatus = "Active" | "Suspended" | "Ended";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 15: params is async
  const { id } = await params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) notFound();

  const quiz = await prisma.quiz.findFirst({
    where: { id, user: { email } },
    include: {
      items: {
        include: {
          question: { include: { answers: true } }, // schema uses Answer[]
          responses: { select: { choiceId: true, isCorrect: true } },
        },
      },
    },
  });

  if (!quiz) notFound();

  const items = (quiz.items ?? [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((it) => ({
      id: it.id,
      order: it.order,
      marked: it.marked,
      question: {
        id: it.question.id,
        // UI expects "stem"; map from Question.text
        stem: it.question.text ?? "",
        explanation: it.question.explanation ?? null,
        choices: it.question.answers.map((a) => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      },
      responses: it.responses?.length
        ? [
            {
              choiceId: it.responses[0]?.choiceId ?? null,
              isCorrect: it.responses[0]?.isCorrect ?? null,
            },
          ]
        : [],
    }));

  // Narrow status to the union the UI expects
  const rawStatus = quiz.status ?? "Active";
  const status: QuizStatus =
    rawStatus === "Active" || rawStatus === "Suspended" || rawStatus === "Ended"
      ? rawStatus
      : "Active";

  const initialQuiz = {
    id: quiz.id,
    status,
    items,
  };

  return <QuizRunner initialQuiz={initialQuiz} />;
}
