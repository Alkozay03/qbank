// src/app/quiz/new/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ROTATION_NAMES = ["Internal Medicine", "General Surgery", "Pediatrics", "Obs/Gyn"] as const;

export default async function CreateQuizPage() {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/quiz/new")}`);
  const userId = session.user.id as string;

  // Ensure rotations exist (seed if needed)
  await Promise.all(
    ROTATION_NAMES.map((name) =>
      db.rotation.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const rotations = await db.rotation.findMany({
    where: { name: { in: ROTATION_NAMES as unknown as string[] } },
    orderBy: { name: "asc" },
  });

  // Build stats for each rotation
  const stats = await Promise.all(
    rotations.map(async (rot) => {
      const total = await db.question.count({ where: { rotationId: rot.id } });

      const responsesTotal = await db.response.count({
        where: {
          quizItem: {
            question: { rotationId: rot.id },
            quiz: { userId }, // <-- move under quizItem
          },
        },
      });

      const correct = await db.response.count({
        where: {
          quizItem: {
            question: { rotationId: rot.id },
            quiz: { userId },
          },
          isCorrect: true,
        },
      });

      const incorrect = await db.response.count({
        where: {
          quizItem: {
            question: { rotationId: rot.id },
            quiz: { userId },
          },
          isCorrect: false,
        },
      });

      const omitted = await db.response.count({
        where: {
          quizItem: {
            question: { rotationId: rot.id },
            quiz: { userId },
          },
          isCorrect: null, // adjust if your schema uses a different omitted flag
        },
      });

      const unsolved = Math.max(total - responsesTotal, 0);

      return {
        rotationId: rot.id,
        rotationName: rot.name,
        total,
        unsolved,
        correct,
        incorrect,
        omitted,
      };
    })
  );

  return (
    <main className="min-h-[calc(100vh-56px)] pt-2">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Create a Quiz</h1>
        <p className="text-slate-600">Choose one or more rotations. Maximum 40 questions per block.</p>

        {/* Selection form */}
        <form
          action="/api/quiz/create"
          method="post"
          className="space-y-6 text-left mx-auto max-w-xl"
        >
          {/* Rotations grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((s) => (
              <label
                key={s.rotationId}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 hover:shadow transition flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{s.rotationName}</div>
                  <input
                    type="checkbox"
                    name="rotationIds"
                    value={s.rotationId}
                    className="h-4 w-4"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500"># Unsolved</div>
                    <div className="font-semibold">{s.unsolved}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500"># Correct</div>
                    <div className="font-semibold">{s.correct}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500"># Incorrect</div>
                    <div className="font-semibold">{s.incorrect}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500"># Omitted</div>
                    <div className="font-semibold">{s.omitted}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Question count */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-slate-700">
              Number of questions
            </label>
            <input
              type="number"
              name="count"
              min={1}
              max={40}
              defaultValue={20}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] text-white px-5 py-2.5 font-medium shadow hover:bg-[var(--primary-600)] transition active:translate-y-px"
            >
              Start Quiz
            </button>
            <Link href="/year4" className="text-slate-600 hover:text-slate-800 text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
