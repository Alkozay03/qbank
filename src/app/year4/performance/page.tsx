// Optimized performance page - parallel queries and better data handling
export const dynamic = "force-dynamic";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import db from "@/lib/db";
import { getGradientTextClasses } from "@/utils/gradients";

// Helper function to calculate statistics efficiently
function calculateStats(responses: Array<{isCorrect: boolean | null; timeSeconds: number | null; quizItem: {questionId: string}; createdAt: Date}>) {
  // For accuracy calculations, use total responses
  const totalResponses = responses.length;
  const totalCorrect = responses.filter((r) => r.isCorrect).length;
  const totalIncorrect = totalResponses - totalCorrect;
  
  // For "questions answered" count, use unique questions
  const uniqueQuestionIds = new Set(responses.map(r => r.quizItem.questionId).filter(Boolean));
  const answered = uniqueQuestionIds.size;
  
  const avgPercent = totalResponses ? Math.round((totalCorrect / totalResponses) * 100) : 0;
  
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
  const userId = session?.user?.id;

  // Default values
  let stats = {
    answered: 0,
    avgPercent: 0,
    usedPercent: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalOmitted: 0,
    totalQuestions: 0,
    c2i: 0,
    i2c: 0,
    i2i: 0,
    avgSeconds: 0
  };

  try {
    // ✅ OPTIMIZATION: Get userId directly from session (no database lookup needed)
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // ✅ OPTIMIZATION: Run queries in parallel instead of sequential
    const [totalQuestions, responses] = await Promise.all([
      // Query 1: Get total questions count
      db.question.count(),
      
      // Query 2: Get user responses with optimized select
      db.response.findMany({
        where: {
          userId, // Use userId directly from session
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
      totalQuestions,
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
        <CircleStat label={`Qbank Usage (${stats.answered}/${stats.totalQuestions})`} value={stats.usedPercent} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-primary-light rounded-2xl border-2 border-primary shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/70 rounded-full mr-3"></div>
            <div className={`text-xl font-bold ${getGradientTextClasses()}`}>Your Score</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-inner">
              <span className="font-medium text-primary">Total Correct</span>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-400 bg-clip-text text-transparent">{stats.totalCorrect}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-inner">
              <span className="font-medium text-primary">Total Incorrect</span>
              <span className="text-lg font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">{stats.totalIncorrect}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-inner">
              <span className="font-medium text-primary">Total Omitted</span>
              <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent">{stats.totalOmitted}</span>
            </div>
          </div>
        </div>

        <div className="bg-primary-light rounded-2xl border-2 border-primary shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-primary/70 to-primary/40 rounded-full mr-3"></div>
            <div className={`text-xl font-bold ${getGradientTextClasses()}`}>Answer Changes</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-inner">
              <span className="font-medium text-primary">Correct to Incorrect</span>
              <span className="text-lg font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">{stats.c2i}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-inner">
              <span className="font-medium text-primary">Incorrect to Correct</span>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-400 bg-clip-text text-transparent">{stats.i2c}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-inner">
              <span className="font-medium text-primary">Incorrect to Incorrect</span>
              <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent">{stats.i2i}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-primary-light rounded-2xl border-2 border-primary shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-primary/40 to-primary/20 rounded-full mr-3"></div>
          <div className={`text-xl font-bold ${getGradientTextClasses()}`}>Average Time</div>
        </div>
        <div className="bg-white rounded-xl shadow-inner p-6 text-center">
          <div className={`text-4xl font-bold mb-2 ${getGradientTextClasses()}`}>{stats.avgSeconds}s</div>
          <div className="text-primary opacity-70">Per Question</div>
        </div>
      </div>
    </Shell>
  );
}

// Circle statistic component with your beautiful gradient inspirations
function CircleStat({ label, value }: { label: string; value: number }) {
  // Generate unique ID for this component instance
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="bg-primary-light rounded-2xl border-2 border-primary shadow-lg p-6">
      <div className="flex flex-col items-center bg-white rounded-xl shadow-inner p-6">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            {/* Theme-aware gradient - colors controlled by CSS */}
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="progress-start-color" stopOpacity="1" />
                <stop offset="100%" className="progress-end-color" stopOpacity="1" />
              </linearGradient>
            </defs>
            
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="var(--color-primary)"
              strokeWidth="8"
              fill="none"
              className="opacity-15"
            />
            
            {/* Progress circle with your beautiful gradients */}
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke={`url(#${gradientId})`}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(value / 100) * 314.159} 314.159`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className={`text-3xl font-bold ${getGradientTextClasses()}`}
              style={{
                background: 'var(--theme-gradient, linear-gradient(135deg, #ec4899, #f472b6))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >{value}%</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-center text-primary">{label}</h3>
      </div>
    </div>
  );
}
