// src/app/year3/quiz/[id]/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import QuizRunner from "../_components/QuizRunner";
import { PreClerkshipTagType } from "@prisma/client";

const DISPLAY_TAG_TYPES = ["SUBJECT", "SYSTEM", "WEEK", "LECTURE", "RESOURCE"] as const;
type DisplayTagType = typeof DISPLAY_TAG_TYPES[number];

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

  const viewer = await prisma.user.findUnique({
    where: { email },
    select: { firstName: true, lastName: true, role: true },
  });

  const quiz = await prisma.preClerkshipQuiz.findFirst({
    where: { id, User: { email }, yearLevel: 3 },
    select: {
      id: true,
      PreClerkshipQuizItem: {
        select: {
          id: true,
          orderInQuiz: true,
          marked: true,
          PreClerkshipQuestion: {
            select: {
              id: true,
              customId: true,
              text: true,
              explanation: true,
              objective: true,
              iduScreenshotUrl: true,
              questionImageUrl: true,
              explanationImageUrl: true,
              references: true,
              isAnswerConfirmed: true,
              PreClerkshipQuestionOccurrence: {
                select: {
                  year: true,
                  weekNumber: true,
                  lecture: true,
                  orderIndex: true,
                },
                orderBy: { orderIndex: "asc" },
              },
              PreClerkshipQuestionTag: { 
                include: { 
                  PreClerkshipTag: true 
                } 
              },
              PreClerkshipAnswer: { 
                select: { 
                  id: true, 
                  text: true, 
                  isCorrect: true 
                } 
              },
            },
          },
          PreClerkshipResponse: { 
            select: { 
              choiceId: true, 
              isCorrect: true 
            } 
          },
        },
      },
    },
  });

  if (!quiz) notFound();

  const items = (quiz.PreClerkshipQuizItem ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (a.orderInQuiz ?? 0) - (b.orderInQuiz ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((it: any) => {
      const rawTagLinks = (it.PreClerkshipQuestion.PreClerkshipQuestionTag ?? []) as Array<{ 
        PreClerkshipTag: { type: string; value: string } 
      }>;
      
      const legacy = rawTagLinks.reduce<{
        references: string[];
        tags: { type: DisplayTagType; value: string; label: string }[];
        seen: Set<string>;
      }>(({ references, tags, seen }, entry) => {
        const tag = entry?.PreClerkshipTag;
        if (!tag || typeof tag.type !== "string") return { references, tags, seen };
        const typeKey = tag.type as keyof typeof PreClerkshipTagType;
        const type = PreClerkshipTagType[typeKey];
        if (!type) return { references, tags, seen };
        const rawValue = typeof tag.value === "string" ? tag.value.trim() : "";
        if (!rawValue) return { references, tags, seen };

        if (type === PreClerkshipTagType.TOPIC) {
          if (!references.includes(rawValue)) {
            references.push(rawValue);
          }
          return { references, tags, seen };
        }

        if (type === PreClerkshipTagType.MODE) {
          return { references, tags, seen };
        }

        if (!DISPLAY_TAG_TYPES.includes(type as DisplayTagType)) {
          return { references, tags, seen };
        }

        const canonical = rawValue; // PreClerkship tags are already canonical (Week 1, Lecture 1, etc.)
        const key = `${type}-${canonical}`;
        if (seen.has(key)) {
          return { references, tags, seen };
        }

        seen.add(key);
        tags.push({
          type: type as DisplayTagType,
          value: canonical,
          label: canonical, // Display as-is (Week 1, Lecture 1, etc.)
        });
        return { references, tags, seen };
      },
      { references: [], tags: [], seen: new Set<string>() });

      const storedReferences = (() => {
        const raw = typeof it.PreClerkshipQuestion.references === "string" ? it.PreClerkshipQuestion.references : "";
        if (!raw.trim()) return [] as string[];
        return raw
          .replace(/\r/g, "")
          .split(/\n+/)
          .flatMap((segment: string) => segment.split(/\s*[;,]\s*/))
          .map((value: string) => value.trim())
          .filter(Boolean);
      })();

      const mergedReferences = Array.from(new Set([...storedReferences, ...legacy.references]));
      
      return {
        id: it.id,
        order: it.orderInQuiz,
        marked: it.marked,
        question: {
          id: it.PreClerkshipQuestion.id,
          customId: it.PreClerkshipQuestion.customId ?? null,
          stem: it.PreClerkshipQuestion.text ?? "",
          explanation: it.PreClerkshipQuestion.explanation ?? null,
          objective: it.PreClerkshipQuestion.objective ?? null,
          questionYear: null, // Pre-clerkship doesn't have yearCaptured
          rotationNumber: null, // Pre-clerkship doesn't have rotationNumber
          iduScreenshotUrl: it.PreClerkshipQuestion.iduScreenshotUrl ?? null,
          questionImageUrl: it.PreClerkshipQuestion.questionImageUrl ?? null,
          explanationImageUrl: it.PreClerkshipQuestion.explanationImageUrl ?? null,
          isAnswerConfirmed: it.PreClerkshipQuestion.isAnswerConfirmed ?? true,
          occurrences: (it.PreClerkshipQuestion.PreClerkshipQuestionOccurrence ?? []).map((occ: { 
            year: string | null; 
            weekNumber: number | null; 
            lecture: string | null; 
            orderIndex: number | null 
          }) => ({
            year: occ.year ?? null,
            weekNumber: occ.weekNumber ?? null,
            lecture: occ.lecture ?? null,
            orderIndex: typeof occ.orderIndex === "number" ? occ.orderIndex : null,
          })),
          references: mergedReferences.join("\n"),
          tags: legacy.tags,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          choices: it.PreClerkshipQuestion.PreClerkshipAnswer.map((a: any) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        },
        responses: it.PreClerkshipResponse?.length
          ? [
              {
                choiceId: it.PreClerkshipResponse[0]?.choiceId ?? null,
                isCorrect: it.PreClerkshipResponse[0]?.isCorrect ?? null,
              },
            ]
          : [],
      };
    });

  // Narrow status to the union the UI expects
  const status: QuizStatus = "Active"; // DB status type mismatch safe default

  const initialQuiz = {
    id: quiz.id,
    status,
    items,
    viewer: {
      name: [viewer?.firstName, viewer?.lastName]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join(" ")
        .trim() || session?.user?.name || null,
      email,
      role: (viewer?.role ?? null) as "MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null,
    },
  };

  return <QuizRunner initialQuiz={initialQuiz} />;
}
