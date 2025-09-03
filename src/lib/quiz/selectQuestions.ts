// src/lib/quiz/selectQuestions.ts
import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";

/**
 * Lightweight selector that works with the current Prisma schema.
 * Filters by ROTATION tags and returns up to `take` question IDs.
 *
 * Notes:
 * - Ignores "types" (no per-user progress table yet).
 * - Does not use DB-level random; we shuffle client-side for portability.
 */
export async function selectQuestions(opts: {
  userId: string;         // kept for future personalization
  rotationKeys: string[]; // e.g. ["im", "gs", "peds", "obgyn"]
  types?: string[];       // currently unused
  take: number;           // 1..40
}): Promise<string[]> {
  const { rotationKeys, take } = opts;

  // Map UI keys -> Tag.value strings used for ROTATION tags in your DB.
  // Adjust these if your Tag.value strings differ.
  const rotationMap: Record<string, string> = {
    im: "Internal Medicine",
    gs: "General Surgery",
    peds: "Pediatrics",
    obgyn: "Obstetrics and Gynaecology",
  };

  const wantedRotations = rotationKeys.map((k) => rotationMap[k]).filter(Boolean);

  const where =
    wantedRotations.length > 0
      ? {
          questionTags: {
            some: {
              tag: {
                type: TagType.ROTATION,
                value: { in: wantedRotations },
              },
            },
          },
        }
      : {};

  // Pull a pool (oversample for better shuffle), then shuffle and slice.
  const pool = await prisma.question.findMany({
    where,
    select: { id: true },
    take: Math.max(take * 3, take),
    orderBy: { createdAt: "desc" },
  });

  // Fisher–Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, take).map((q: { id: string }) => q.id);
}
