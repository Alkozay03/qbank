// Optimized performance page - parallel queries and better data handling
export const dynamic = "force-dynamic";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import db from "@/lib/db";

// Helper function to calculate statistics efficiently
function calculateStats(responses: Array<{isCorrect: boolean | null; timeSeconds: number | null; quizItem: {questionId: string}; createdAt: Date}>) {
  const answered = responses.length;
  const totalCorrect = responses.filter((r) => r.isCorrect).length;
  const totalIncorrect = answered - totalCorrect;
  
  const avgPercent = answered ? Math.round((totalCorrect / answered) * 100) : 0;
  
  // Calculate answer changes efficiently
  const byQuestion = new Map<string, typeof responses>();
  for (const r of responses) {
    const qid = r.quizItem.questionId;
    if (!qid) continue;
    if (!byQuestion.has(qid)) byQuestion.set(qid, []);
    byQuestion.get(qid)!.push(r);
  }

  let c2i = 0, i2c = 0, i2i = 0;
  for (const [, attempts] of byQuestion) {
    for (let i = 1; i < attempts.length; i++) {
      const prev = attempts[i - 1].isCorrect;
      const cur = attempts[i].isCorrect;
      if (prev === true && cur === false) c2i++;
      else if (prev === false && cur === true) i2c++;
      else if (prev === false && cur === false) i2i++;
    }
  }

  // Calculate average time efficiently
  const times = responses
    .map((r) => (typeof r.timeSeconds === "number" ? r.timeSeconds : Number(r.timeSeconds)))
    .filter((n) => Number.isFinite(n) && (n as number) > 0) as number[];
  
  const avgSeconds = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return {
    answered,
    totalCorrect,
    totalIncorrect,
    avgPercent,
    c2i,
    i2c,
    i2i,
    avgSeconds
  };
}

export default async function Performance() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  // Default values
  let stats = {
    avgPercent: 0,
    usedPercent: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalOmitted: 0,
    c2i: 0,
    i2c: 0,
    i2i: 0,
    avgSeconds: 0
  };

  try {
    // Get user ID first
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user?.id) {
      throw new Error("User not found");
    }

    // ✅ OPTIMIZATION: Run queries in parallel instead of sequential
    const [totalQuestions, responses] = await Promise.all([
      // Query 1: Get total questions count
      db.question.count(),
      
      // Query 2: Get user responses with optimized select
      db.response.findMany({
        where: {
          userId: user.id, // Use user.id directly instead of user?.id ?? ""
        },
        select: {
          isCorrect: true,
          createdAt: true,
          timeSeconds: true,
          quizItem: { 
            select: { questionId: true } 
          },
        },
        orderBy: { createdAt: "asc" },
      })
    ]);

    // Calculate all stats in memory (much faster than multiple DB queries)
    const calculatedStats = calculateStats(responses);
    
    // Calculate usage percentage
    const usedPercent = totalQuestions ? Math.round((calculatedStats.answered / totalQuestions) * 100) : 0;

    stats = {
      ...calculatedStats,
      usedPercent,
      totalOmitted: 0, // This remains 0 as per original logic
    };

  } catch (error) {
    console.error("Performance page error:", error);
    // Keep default values on error
  }

  return (
    <Shell title="Statistics & Milestones" pageName="Performance">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CircleStat label="Average Score" value={stats.avgPercent} />
        <CircleStat label="Qbank Usage" value={stats.usedPercent} />
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
              <span className="text-lg font-bold text-[#22c55e]">{stats.totalCorrect}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Total Incorrect</span>
              <span className="text-lg font-bold text-[#ef4444]">{stats.totalIncorrect}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Total Omitted</span>
              <span className="text-lg font-bold text-[#f59e0b]">{stats.totalOmitted}</span>
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
              <span className="text-lg font-bold text-[#ef4444]">{stats.c2i}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Incorrect to Correct</span>
              <span className="text-lg font-bold text-[#22c55e]">{stats.i2c}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-[#E6F0F7]">
              <span className="font-medium text-slate-700">Incorrect to Incorrect</span>
              <span className="text-lg font-bold text-[#ef4444]">{stats.i2i}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-br from-white to-[#F8FCFF] rounded-2xl border border-[#E6F0F7] shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-[#A5CDE4] to-[#C4E3F7] rounded-full mr-3"></div>
          <div className="text-xl font-bold text-[#2F6F8F]">Average Time</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-[#2F6F8F] mb-2">{stats.avgSeconds}s</div>
          <div className="text-slate-600">Per Question</div>
        </div>
      </div>
    </Shell>
  );
}

// Circle statistic component (unchanged for design consistency)
function CircleStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gradient-to-br from-white to-[#F8FCFF] rounded-2xl border border-[#E6F0F7] shadow-lg p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#E6F0F7"
              strokeWidth="8"
              fill="none"
              className="opacity-30"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(value / 100) * 314.16} 314.16`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2F6F8F" />
                <stop offset="50%" stopColor="#56A2CD" />
                <stop offset="100%" stopColor="#A5CDE4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-[#2F6F8F]">{value}%</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#2F6F8F] text-center">{label}</h3>
      </div>
    </div>
  );
}
