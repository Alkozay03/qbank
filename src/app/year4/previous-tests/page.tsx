// src/app/year4/previous-tests/page.tsx
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { db } from "@/server/db";

export default async function PreviousTests() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  let rows: {
    id: string;
    name: string;
    scorePercent: number;
    mode: string;
    count: number;
  }[] = [];

  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    const quizzes = await db.quiz.findMany({
      where: { userId: user?.id ?? "" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true },
    });

    rows = await Promise.all(
      quizzes.map(async (q) => {
        const items = await db.quizItem.count({ where: { quizId: q.id } });
        const responses = await db.response.findMany({
          where: { quizItem: { quizId: q.id } },
          select: { isCorrect: true },
        });
        const correct = responses.filter((r) => r.isCorrect).length;
        const score = responses.length ? Math.round((correct / responses.length) * 100) : 0;
        return {
          id: q.id,
          name: q.name ?? `Test ${q.id.slice(0, 6)}`,
          scorePercent: score,
          mode: "-",
          count: items,
        };
      })
    );
  } catch {
    rows = [];
  }

  return (
    <Shell title="Previous Tests" pageName="Previous Tests">
      <div className="rounded-2xl bg-white border border-[#E6F0F7] shadow p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600">
            <tr>
              <th className="py-2 pr-4">Score</th>
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
                <td className="py-2 pr-4">{r.id}</td>
                <td className="py-2 pr-4">
                  <span>{r.name}</span>
                  <button className="ml-2 text-[#3B82A0]" title="Rename">✏️</button>
                </td>
                <td className="py-2 pr-4">{r.mode}</td>
                <td className="py-2 pr-4">{r.count}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-3">
                    <button title="Review Test" className="text-[#3B82A0]">🔍</button>
                    <button title="Test Results" className="text-[#2F6F8F]">📊</button>
                    <button title="Test Analysis" className="text-[#56A2CD]">📈</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-6 text-slate-500" colSpan={6}>
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
