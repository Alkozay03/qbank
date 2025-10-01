// src/app/year4/performance/page.tsx
export const dynamic = "force-dynamic";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import db from "@/lib/db";

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

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-white to-[#F8FCFF] rounded-2xl border border-[#E6F0F7] shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-[#2F6F8F] to-[#56A2CD] rounded-full mr-3"></div>
            <div className="text-xl font-bold text-[#2F6F8F]">Your Score</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Total Correct</span>
              <span className="text-lg font-bold text-[#22c55e]">{totalCorrect}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Total Incorrect</span>
              <span className="text-lg font-bold text-[#ef4444]">{totalIncorrect}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Total Omitted</span>
              <span className="text-lg font-bold text-[#f59e0b]">{totalOmitted}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-[#F8FCFF] rounded-2xl border border-[#E6F0F7] shadow-lg p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-[#56A2CD] to-[#A5CDE4] rounded-full mr-3"></div>
            <div className="text-xl font-bold text-[#2F6F8F]">Answer Changes</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Correct to Incorrect</span>
              <span className="text-lg font-bold text-[#ef4444]">{c2i}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Incorrect to Correct</span>
              <span className="text-lg font-bold text-[#22c55e]">{i2c}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Incorrect to Incorrect</span>
              <span className="text-lg font-bold text-[#f59e0b]">{i2i}</span>
            </div>
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
  const radius = 75;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="group bg-gradient-to-br from-white via-[#FAFCFE] to-[#F3F9FC] rounded-3xl border-2 border-[#E6F0F7] shadow-xl hover:shadow-2xl transition-all duration-500 p-8 flex flex-col items-center justify-center hover:scale-[1.02] hover:border-[#A5CDE4]">
      <div className="relative mb-6">
        {/* Background circle */}
        <svg 
          height={radius * 2} 
          width={radius * 2} 
          className="transform -rotate-90 drop-shadow-lg"
        >
          {/* Background track */}
          <circle
            stroke="#E6F0F7"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="opacity-30"
          />
          
          {/* Progress circle */}
          <circle
            stroke="url(#progressGradient)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-1000 ease-out drop-shadow-sm"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(47, 111, 143, 0.2))'
            }}
          />
          
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2F6F8F" />
              <stop offset="30%" stopColor="#3B82A0" />
              <stop offset="60%" stopColor="#56A2CD" />
              <stop offset="100%" stopColor="#A5CDE4" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-transparent bg-gradient-to-br from-[#2F6F8F] via-[#3B82A0] to-[#56A2CD] bg-clip-text group-hover:scale-110 transition-transform duration-300">
            {value}
          </div>
          <div className="text-lg font-bold text-[#2F6F8F] opacity-80">
            %
          </div>
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2F6F8F]/5 to-[#A5CDE4]/5 group-hover:from-[#2F6F8F]/10 group-hover:to-[#A5CDE4]/10 transition-all duration-500 blur-xl"></div>
      </div>
      
      {/* Label */}
      <div className="text-center">
        <div className="text-xl font-bold text-transparent bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] bg-clip-text mb-1">
          {label}
        </div>
        <div className="w-12 h-1 bg-gradient-to-r from-[#56A2CD] to-[#A5CDE4] rounded-full mx-auto opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  );
}
