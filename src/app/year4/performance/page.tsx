// src/app/year4/performance/page.tsx
export const dynamic = "force-dynamic";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

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
      where: {
        userId: user?.id ?? "",
      },
      select: {
        isCorrect: true,
        createdAt: true,
        timeSeconds: true,
        quizItem: { select: { questionId: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const answered = responses.length;
    totalCorrect = responses.filter((r) => r.isCorrect).length;
    totalIncorrect = answered - totalCorrect;

    totalOmitted = 0;

    avgPercent = answered ? Math.round((totalCorrect / answered) * 100) : 0;
    usedPercent = totalQuestions ? Math.round((answered / totalQuestions) * 100) : 0;

    const byQuestion = new Map<string, typeof responses>();
    for (const r of responses) {
      const qid = r.quizItem.questionId;
      if (!qid) continue;
      if (!byQuestion.has(qid)) byQuestion.set(qid, []);
      byQuestion.get(qid)!.push(r);
    }

    for (const [, attempts] of byQuestion) {
      for (let i = 1; i < attempts.length; i++) {
        const prev = attempts[i - 1].isCorrect;
        const cur = attempts[i].isCorrect;
        if (prev === true && cur === false) c2i++;
        else if (prev === false && cur === true) i2c++;
        else if (prev === false && cur === false) i2i++;
      }
    }

    const times = responses
      .map((r) => (typeof r.timeSeconds === "number" ? r.timeSeconds : Number(r.timeSeconds)))
      .filter((n) => Number.isFinite(n) && (n as number) > 0) as number[];

    avgSeconds = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  } catch {
    // defaults remain
  }

  return (
    <Shell title="Statistics & Milestones" pageName="Performance">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CircleStat label="Average Score" value={avgPercent} />
        <CircleStat label="Qbank Usage" value={usedPercent} />
      </div>

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
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="28"
          fontWeight="800"
          fill="#2F6F8F"
        >
          {value}%
        </text>
      </svg>
      <div className="text-lg font-semibold text-[#2F6F8F]">{label}</div>
    </div>
  );
}
