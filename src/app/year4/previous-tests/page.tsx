// src/app/year4/previous-tests/page.tsx
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { db } from "@/server/db";
import Link from "next/link";

export default async function PreviousTests() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  // Prefer session.user.id (after Fix #1 it will exist). Fallback to resolving by email.
  let userId = (session?.user as any)?.id ?? null;
  if (!userId && email) {
    const u = await db.user.findUnique({ where: { email }, select: { id: true } });
    userId = u?.id ?? null;
  }

  if (!userId) {
    return (
      <Shell title="Previous Tests" pageName="Previous Tests">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Previous Tests</h1>
          <p className="opacity-80">
            Please{" "}
            <Link href="/login" className="underline">
              sign in
            </Link>{" "}
            to see your tests.
          </p>
        </div>
      </Shell>
    );
  }

  const quizzes = await db.quiz.findMany({
    where: { userId },
    select: { id: true, createdAt: true, mode: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const rows = await Promise.all(
    quizzes.map(async (q) => {
      const [count, total, correct] = await Promise.all([
        db.quizItem.count({ where: { quizId: q.id } }),
        db.response.count({ where: { quizItem: { quizId: q.id } } }),
        db.response.count({ where: { quizItem: { quizId: q.id }, isCorrect: true } }),
      ]);

      return {
        id: q.id,
        name: `Test ${q.id.slice(0, 6)}`, // schema has no Quiz.name
        scorePercent: total ? Math.round((correct / total) * 100) : 0,
        mode: q.mode,
        count,
        createdAt: q.createdAt,
      };
    })
  );

  return (
    <Shell title="Your Previous Tests" pageName="Previous Tests">
      <div className="rounded-2xl bg-white border border-[#E6F0F7] shadow p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600">
            <tr>
              <th className="py-2 pr-4">Score</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Test ID</th>
              <th className="py-2 pr-4">Test Name</th>
              <th className="py-2 pr-4">Question Mode</th>
              <th className="py-2 pr-4"># of Qs</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#E6F0F7]">
                <td className="py-2 pr-4">{r.scorePercent}%</td>
                <td className="py-2 pr-4">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4">{r.id}</td>
                <td className="py-2 pr-4">
                  <span>{r.name}</span>
                  <button className="ml-2 text-[#B0B0B0] cursor-not-allowed" title="Rename not available">✏️</button>
                </td>
                <td className="py-2 pr-4">{r.mode}</td>
                <td className="py-2 pr-4">{r.count}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-3">
                    <Link href={`/quiz/${r.id}`} title="Open / Review" className="text-[#3B82A0]">🔍</Link>
                    <Link href={`/quiz/${r.id}/results`} title="Results" className="text-[#2F6F8F]">📊</Link>
                    <Link href={`/quiz/${r.id}/analysis`} title="Analysis" className="text-[#56A2CD]">📈</Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-6 text-slate-500" colSpan={7}>
                  No tests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
