// src/app/year4/page.tsx
export const dynamic = "force-dynamic"; // add at top of the page file
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import ClientClock from "@/components/ClientClock"; // ✅ use the client clock

export default async function Dashboard() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  // Defaults so UI never breaks
  let name = "Student";
  let avgPercent = 0;
  let usedPercent = 0;
  let testsCompleted = 0;
  let answered = 0; // ✅ y
  let totalQuestions = 0; // ✅ z

  try {
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { firstName: true, email: true, id: true },
    });
    if (user?.firstName) name = user.firstName;

    totalQuestions = await db.question.count();
    const responsesAll = await db.response.findMany({
      where: { quizItem: { quiz: { userId: user?.id ?? "" } } },
      select: { isCorrect: true },
    });

    const correct = responsesAll.filter((r) => r.isCorrect).length;
    answered = responsesAll.length;

    avgPercent = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    usedPercent = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;

    testsCompleted = await db.quiz.count({ where: { userId: user?.id ?? "" } });
  } catch {
    // keep defaults
  }

  return (
    <Shell title={`Welcome, ${name}`} pageName="Dashboard">
      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Question Score */}
        <div className="rounded-2xl bg-white border border-[#E6F0F7] p-4 shadow">
          <div className="text-sm text-slate-600">Question Score</div>
          <div className="mt-2 text-4xl font-extrabold text-[#2F6F8F]">{avgPercent}%</div>
          <div className="text-sm text-slate-600">Correct</div>
        </div>

        {/* Qbank Usage */}
        <div className="rounded-2xl bg-white border border-[#E6F0F7] p-4 shadow">
          <div className="text-sm text-slate-600">Qbank Usage</div>
          <div className="mt-2 text-4xl font-extrabold text-[#2F6F8F]">
            {usedPercent}%
          </div>
          <div className="text-base text-slate-600">
            {answered}/{totalQuestions} Questions Used
          </div>
        </div>

        {/* Tests Completed */}
        <div className="rounded-2xl bg-white border border-[#E6F0F7] p-4 shadow">
          <div className="text-sm text-slate-600">Tests completed</div>
          <div className="mt-2 text-4xl font-extrabold text-[#2F6F8F]">{testsCompleted}</div>
        </div>
      </div>

      {/* Date + Time */}
      <ClientClock />
    </Shell>
  );
}
