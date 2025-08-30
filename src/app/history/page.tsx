// src/app/history/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ExamHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/history")}`);
  const userId = session.user.id as string;

  // Fetch quizzes for this user; adjust fields to your schema
  const quizzes = await db.quiz.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: {
          id: true,
          responses: { select: { isCorrect: true } },
        },
      },
    },
  });

  const rows = quizzes.map((q) => {
    const allResponses = q.items.flatMap((it) => it.responses);
    const total = q.items.length;
    const correct = allResponses.filter((r) => r?.isCorrect === true).length;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    return {
      id: q.id,
      createdAt: q.createdAt,
      total,
      percent,
    };
  });

  return (
    <main className="min-h-[calc(100vh-56px)] pt-2">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Exam History</h1>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3"># Questions</th>
                <th className="text-left px-4 py-3">Test ID</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.percent}%</td>
                  <td className="px-4 py-3">{r.total}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 text-slate-500">—</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No exams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
