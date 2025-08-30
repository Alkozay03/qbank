// src/app/year4/performance/page.tsx
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { db } from "@/server/db";

export default async function Performance() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  let avgPercent = 0;
  let usedPercent = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalOmitted = 0;

  try {
    const user = await db.user.findUnique({ where: { email: userEmail }, select: { id: true } });
    const totalQuestions = await db.question.count();
    const responses = await db.response.findMany({
      where: { quizItem: { quiz: { userId: user?.id ?? "" } } },
      select: { isCorrect: true },
    });

    const answered = responses.length;
    totalCorrect = responses.filter((r) => r.isCorrect).length;
    totalIncorrect = answered - totalCorrect;

    avgPercent = answered ? Math.round((totalCorrect / answered) * 100) : 0;
    usedPercent = totalQuestions ? Math.round((answered / totalQuestions) * 100) : 0;
  } catch {}

  return (
    <Shell title="Statistics & Milestones" pageName="Performance">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CircleStat label="Average Score" value={avgPercent} />
        <CircleStat label="Qbank Usage" value={usedPercent} />
      </div>
    </Shell>
  );
}

function CircleStat({ label, value }: { label: string; value: number }) {
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="bg-white rounded-2xl border border-[#E6F0F7] shadow p-6 flex items-center justify-center gap-6">
      <svg width="160" height="160">
        <circle cx="80" cy="80" r={radius} stroke="#E6F0F7" strokeWidth="12" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#56A2CD"
          strokeWidth="12"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="28" fontWeight="800" fill="#2F6F8F">
          {value}%
        </text>
      </svg>
      <div className="text-lg font-semibold text-[#2F6F8F]">{label}</div>
    </div>
  );
}
