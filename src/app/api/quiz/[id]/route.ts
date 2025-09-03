// src/app/api/quiz/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * GET /api/quiz/[id]
 * Minimal schema-aligned endpoint to fetch a quiz by id for the signed-in user.
 * Extend the `select` if your UI needs more fields.
 */
export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = ctx.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, user: { email } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      // Add more fields if needed by the client
    },
  });

  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(quiz);
}
