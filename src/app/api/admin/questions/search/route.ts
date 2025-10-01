import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { TagType, Prisma } from "@prisma/client";
import { TAG_TYPE_TO_CATEGORY, canonicalizeTagValue } from "@/lib/tags/server";

function normaliseList(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
}

function canonicalise(values: string[], type: TagType): string[] {
  const expanded = new Set<string>();
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    expanded.add(trimmed);
    const canonical = canonicalizeTagValue(type, trimmed);
    if (canonical) {
      expanded.add(canonical);
    }
  });
  return Array.from(expanded);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const rotationValues = canonicalise(
      normaliseList(Array.isArray(body?.rotations) ? body.rotations : []),
      TagType.ROTATION
    );
    const resourceValues = canonicalise(
      normaliseList(Array.isArray(body?.resources) ? body.resources : []),
      TagType.RESOURCE
    );
    const disciplineValues = canonicalise(
      normaliseList(Array.isArray(body?.disciplines) ? body.disciplines : []),
      TagType.SUBJECT
    );
    const systemValues = canonicalise(
      normaliseList(Array.isArray(body?.systems) ? body.systems : []),
      TagType.SYSTEM
    );

    const questionIdRaw = typeof body?.questionId === "string" ? body.questionId.trim() : "";
    const keywordRaw = typeof body?.keywords === "string" ? body.keywords.trim() : "";

    const keywordTerms: string[] = [];
    if (keywordRaw) {
  const parts = keywordRaw.split(/\s+/u).filter(Boolean);
  parts.forEach((part: string) => {
        if (!keywordTerms.includes(part)) keywordTerms.push(part);
      });
      if (!keywordTerms.includes(keywordRaw)) {
        keywordTerms.push(keywordRaw);
      }
    }

    const take = Math.min(Math.max(Number(body?.limit) || 50, 1), 200);

    const whereFilters: Prisma.QuestionWhereInput[] = [];

    if (questionIdRaw) {
      const orFilters: Prisma.QuestionWhereInput[] = [{ id: questionIdRaw }];

      const digitsOnly = questionIdRaw.replace(/[^0-9]/g, "");
      if (digitsOnly) {
        const numericId = Number(digitsOnly);
        if (Number.isInteger(numericId)) {
          orFilters.push({ customId: numericId });
        }
      }

      whereFilters.push({ OR: orFilters });
    }

    if (rotationValues.length) {
      whereFilters.push({
        questionTags: {
          some: {
            tag: {
              type: TagType.ROTATION,
              value: { in: rotationValues },
            },
          },
        },
      });
    }

    if (resourceValues.length) {
      whereFilters.push({
        questionTags: {
          some: {
            tag: {
              type: TagType.RESOURCE,
              value: { in: resourceValues },
            },
          },
        },
      });
    }

    if (disciplineValues.length) {
      whereFilters.push({
        questionTags: {
          some: {
            tag: {
              type: TagType.SUBJECT,
              value: { in: disciplineValues },
            },
          },
        },
      });
    }

    if (systemValues.length) {
      whereFilters.push({
        questionTags: {
          some: {
            tag: {
              type: TagType.SYSTEM,
              value: { in: systemValues },
            },
          },
        },
      });
    }

    if (keywordTerms.length) {
      whereFilters.push({
        AND: keywordTerms.map((term) => ({
          OR: [
            { text: { contains: term, mode: "insensitive" } },
            { explanation: { contains: term, mode: "insensitive" } },
            { objective: { contains: term, mode: "insensitive" } },
            {
              answers: {
                some: { text: { contains: term, mode: "insensitive" } },
              },
            },
            {
              occurrences: {
                some: {
                  OR: [
                    { year: { contains: term, mode: "insensitive" } },
                    { rotation: { contains: term, mode: "insensitive" } },
                  ],
                },
              },
            },
            {
              questionTags: {
                some: {
                  tag: {
                    value: { contains: term, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        })),
      });
    }

    const where: Prisma.QuestionWhereInput = whereFilters.length ? { AND: whereFilters } : {};

    const questions = await prisma.question.findMany({
      where,
      include: {
        answers: { orderBy: { id: "asc" }, select: { text: true, isCorrect: true } },
        questionTags: { include: { tag: true } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });

    const formatted = questions.map((question) => {
      const answerLabels = ["A", "B", "C", "D", "E"];
      const correctIndex = question.answers.findIndex((answer) => answer.isCorrect);
      const correctAnswer = correctIndex >= 0 ? answerLabels[correctIndex] : "";

      const tagsSet = new Set<string>();
      for (const { tag } of question.questionTags) {
        const typeKey = tag.type as TagType;
        const category = TAG_TYPE_TO_CATEGORY[typeKey];
        if (!category || category === "topic" || category === "mode") continue;
        const canonical = canonicalizeTagValue(typeKey, tag.value);
        if (!canonical) continue;
        tagsSet.add(`${category}:${canonical}`);
      }
      const tags = Array.from(tagsSet);

      const categoryMap = new Map<string, string>();
      for (const { tag } of question.questionTags) {
        const category = TAG_TYPE_TO_CATEGORY[tag.type];
        if (!category || category === "topic" || category === "mode") continue;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, tag.value);
        }
      }

      return {
        id: question.id,
        customId: question.customId ?? null,
        questionText: question.text ?? "",
        correctAnswer,
        rotation: categoryMap.get("rotation") ?? null,
        resource: categoryMap.get("resource") ?? null,
        discipline: categoryMap.get("discipline") ?? null,
        system: categoryMap.get("system") ?? null,
        updatedAt: question.updatedAt,
        createdAt: question.createdAt,
        tags,
      };
    });

    return NextResponse.json({ questions: formatted });
  } catch (error) {
    console.error("Error searching questions:", error);
    return NextResponse.json({ error: "Failed to search questions" }, { status: 500 });
  }
}
