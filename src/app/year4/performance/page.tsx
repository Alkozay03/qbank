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
  let c2i = 0, i2c = 0, i2i = 0;
  let avgSeconds = 0;

  try {
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    const totalQuestions = await db.question.count();
    const responses = await db.response.findMany({
      where: { quizItem: { quiz: { userId: user?.id ?? "" } } },
      select: { isCorrect: true /* , timeSeconds, prevState */ },
    });

    const answered = responses.length;
    totalCorrect = responses.filter((r) => r.isCorrect).length;
    totalIncorrect = answered - totalCorrect;

    // Omitted: depends on your schema; left as 0 unless you store it
    totalOmitted = 0;

    avgPercent = answered ? Math.round((totalCorrect / answered) * 100) : 0;
    usedPercent = totalQuestions
      ? Math.round((answered / totalQuestions) * 100)
      : 0;

    // Answer change placeholders
    c2i = 0;
    i2c = 0;
    i2i = 0;

    // Avg time placeholder
    avgSeconds = 0;
  } catch {
    // keep placeholders
  }

  return (
    <Shell title="Statistics & Milestones" pageName="Performance">
      {/* Progress circles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CircleStat label="Average Score" value={avgPercent} />
        <CircleStat label="Qbank Usage" value={usedPercent} />
      </div>

      {/* Two mini tables */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E6F0F7] shadow p-4">
          <div className="text-lg font-semibold text-[#2F6F8F]">Your Score</div>
          <div className="mt-3 space-y-2 text-slate-700">
            <div className="flex justify-between"><span>Total Correct</span><span>{totalCorrect}</span></div>
            <div className="flex justify-between"><span>Total Incorrect</span><span>{totalIncorrect}</span></div>
            <div className="flex justify-between"><span>Total Omitted</span><span>{totalOmitted}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6F0F7] shadow p-4">
          <div className="text-lg font-semibold text-[#2F6F8F]">Answer Changes</div>
          <div className="mt-3 space-y-2 text-slate-700">
            <div className="flex justify-between"><span>Correct to Incorrect</span><span>{c2i}</span></div>
            <div className="flex justify-between"><span>Incorrect to Correct</span><span>{i2c}</span></div>
            <div className="flex justify-between"><span>Incorrect to Incorrect</span><span>{i2i}</span></div>
          </div>
        </div>
      </div>

      {/* Avg time */}
      <div className="mt-10 text-center">
        <div className="text-5xl font-extrabold text-[#2F6F8F]">~{avgSeconds}</div>
        <div className="text-slate-600">Seconds Spent on a Question</div>
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
