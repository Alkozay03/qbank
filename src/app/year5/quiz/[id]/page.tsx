// src/app/year5/quiz/[id]/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import QuizRunner from "../_components/QuizRunner";
import { TagType } from "@prisma/client";
import { canonicalizeTagValue, labelForTag } from "@/lib/tags/server";

const DISPLAY_TAG_TYPES = ["SUBJECT", "SYSTEM", "ROTATION", "RESOURCE"] as const;
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

  const quiz = await prisma.quiz.findFirst({
    where: { id, User: { email } },
    select: {
      id: true,
      QuizItem: {
        select: {
          id: true,
          orderInQuiz: true,
          marked: true,
          Question: {
            select: {
              id: true,
              customId: true,
              questionType: true,
              text: true,
              emqTheme: true,
              emqOptions: true,
              explanation: true,
              objective: true,
              yearCaptured: true,
              rotationNumber: true,
              iduScreenshotUrl: true,
              questionImageUrl: true,
              explanationImageUrl: true,
              references: true,
              isAnswerConfirmed: true,
              QuestionOccurrence: {
                select: {
                  year: true,
                  rotation: true,
                  orderIndex: true,
                },
                orderBy: { orderIndex: "asc" },
              },
              QuestionTag: { include: { Tag: true } },
              Choice: { select: { id: true, text: true, isCorrect: true, correctOptionIds: true, stemImageUrl: true } },
            },
          },
          Response: { select: { choiceId: true, isCorrect: true } },
        },
      },
    },
  });

  if (!quiz) notFound();

  const items = (quiz.QuizItem ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (a.orderInQuiz ?? 0) - (b.orderInQuiz ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((it: any) => {
      const rawTagLinks = (it.Question.QuestionTag ?? []) as Array<{ Tag: { type: string; value: string } }>;
      const legacy = rawTagLinks.reduce<{
        references: string[];
        tags: { type: DisplayTagType; value: string; label: string }[];
        seen: Set<string>;
      }>(({ references, tags, seen }, entry) => {
        const tag = entry?.Tag;
        if (!tag || typeof tag.type !== "string") return { references, tags, seen };
        const typeKey = tag.type as keyof typeof TagType;
        const type = TagType[typeKey];
        if (!type) return { references, tags, seen };
        const rawValue = typeof tag.value === "string" ? tag.value.trim() : "";
        if (!rawValue) return { references, tags, seen };

        if (type === TagType.TOPIC) {
          if (!references.includes(rawValue)) {
            references.push(rawValue);
          }
          return { references, tags, seen };
        }

        if (type === TagType.MODE) {
          return { references, tags, seen };
        }

        if (!DISPLAY_TAG_TYPES.includes(type as DisplayTagType)) {
          return { references, tags, seen };
        }

        const canonical = canonicalizeTagValue(type, rawValue);
        if (!canonical) {
          return { references, tags, seen };
        }

        const key = `${type}-${canonical}`;
        if (seen.has(key)) {
          return { references, tags, seen };
        }

        seen.add(key);
        tags.push({
          type: type as DisplayTagType,
          value: canonical,
          label: labelForTag(type, canonical),
        });
        return { references, tags, seen };
      },
      { references: [], tags: [], seen: new Set<string>() });

      const storedReferences = (() => {
        const raw = typeof it.question.references === "string" ? it.question.references : "";
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
          id: it.Question.id,
          customId: it.Question.customId ?? null,
          questionType: it.Question.questionType ?? 'MCQ',
          stem: it.Question.text ?? "",
          emqTheme: it.Question.emqTheme ?? null,
          emqOptions: it.Question.emqOptions ?? null,
          explanation: it.Question.explanation ?? null,
          objective: it.Question.objective ?? null,
          questionYear: it.Question.yearCaptured ?? null,
          rotationNumber: it.Question.rotationNumber ?? null,
          iduScreenshotUrl: it.Question.iduScreenshotUrl ?? null,
          questionImageUrl: it.Question.questionImageUrl ?? null,
          explanationImageUrl: it.Question.explanationImageUrl ?? null,
          isAnswerConfirmed: it.Question.isAnswerConfirmed ?? true,
          occurrences: (it.Question.QuestionOccurrence ?? []).map((occ: { year: string | null; rotation: string | null; orderIndex: number | null }) => ({
            year: occ.year ?? null,
            rotation: occ.rotation ?? null,
            orderIndex: typeof occ.orderIndex === "number" ? occ.orderIndex : null,
          })),
          references: mergedReferences.join("\n"),
          tags: legacy.tags,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          choices: it.Question.Choice.map((a: any) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
            correctOptionIds: a.correctOptionIds ?? null,
            stemImageUrl: a.stemImageUrl ?? null,
          })),
        },
        responses: it.Response?.length
          ? [
              {
                choiceId: it.responses[0]?.choiceId ?? null,
                isCorrect: it.responses[0]?.isCorrect ?? null,
              },
            ]
          : [],
      };
    });

  // Narrow status to the union the UI expects
  const status: QuizStatus = "Active"; // DB status type mismatch safe default

  // Map Prisma Role enum to QuizRunner expected role type
  const mapRole = (role: string | null): "MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null => {
    if (!role) return null;
    if (role === "User") return "MEMBER";
    if (role === "Admin") return "ADMIN";
    if (role === "MASTER_ADMIN") return "MASTER_ADMIN";
    if (role === "WEBSITE_CREATOR") return "WEBSITE_CREATOR";
    return null;
  };

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
      role: mapRole(viewer?.role ?? null),
    },
  };

  return <QuizRunner initialQuiz={initialQuiz} />;
}
