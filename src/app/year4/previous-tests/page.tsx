// src/app/year4/previous-tests/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Shell from "@/components/Shell";
import { auth } from "@/auth";
import db from "@/lib/db";
import Link from "next/link";

type ScoreRow = {
  id: string;
  shortId: string;
  status: string | null;
  createdAt: Date;
  questionCount: number;
  rotationLabel: string;
  scorePercent: number;
  scoreBackground: string;
};

const SCORE_COLORS = [
  "#ff0000","#ff0d00","#ff1a00","#ff2700","#ff3400","#ff4100","#ff4e00","#ff5c00",
  "#ff6900","#ff7600","#ff8300","#ff9000","#ff9d00","#ffaa00","#ffb700","#ffc400",
  "#ffd100","#ffde00","#ffeb00","#fff800","#f8ff00","#ebff00","#deff00","#d1ff00",
  "#c4ff00","#b7ff00","#aaff00","#9dff00","#90ff00","#83ff00","#76ff00","#69ff00",
  "#5cff00","#4eff00","#41ff00","#34ff00","#27ff00","#1aff00","#0dff00","#00ff00",
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function pickScoreColor(percent: number) {
  const clamped = clampPercent(percent);
  const index = Math.round((clamped / 100) * (SCORE_COLORS.length - 1));
  return SCORE_COLORS[index];
}

function lightenHex(hex: string, ratio = 0.35) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");

  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export default async function PreviousTests() {
  const session = await auth();
  const userId = session?.user?.id;

  // ✅ OPTIMIZATION: Get userId directly from session (no database lookup)
  if (!userId) {
    return (
      <Shell title="Previous Tests" pageName="Previous Tests">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Previous Tests</h1>
          <p className="opacity-80">
            Please {" "}
            <Link href="/login" className="underline">
              sign in
            </Link>{" "}
            to see your tests.
          </p>
        </div>
      </Shell>
    );
  }

  let quizzes: Array<{
    id: string;
    status: string | null;
    createdAt: Date;
    _count: { items: number };
  }> = [];
  
  const quizStats: Map<string, { correct: number; total: number; rotation: string }> = new Map();

  try {
    // ✅ OPTIMIZATION: Fetch only summary data, not all questions/answers
    quizzes = await db.quiz.findMany({
      where: { 
        userId,
        status: { in: ["Suspended", "Ended"] }
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        _count: {
          select: { items: true } // Count questions instead of fetching them
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // ✅ OPTIMIZATION: For each quiz, get aggregated stats in parallel
    const statsPromises = quizzes.map(async (quiz) => {
      // Get response stats - count total and correct separately
      const [totalResponses, correctResponses, rotationTag] = await Promise.all([
        db.response.count({
          where: {
            quizItem: { quizId: quiz.id },
            choiceId: { not: null },
          },
        }),
        db.response.count({
          where: {
            quizItem: { quizId: quiz.id },
            choiceId: { not: null },
            isCorrect: true,
          },
        }),
        // Get rotation from first question tag
        db.questionTag.findFirst({
          where: {
            question: {
              quizItems: {
                some: { quizId: quiz.id }
              }
            },
            tag: { type: "ROTATION" }
          },
          select: {
            tag: { select: { value: true }}
          }
        })
      ]);

      return { 
        quizId: quiz.id, 
        correct: correctResponses, 
        total: totalResponses, 
        rotation: rotationTag?.tag.value || "General" 
      };
    });

    const allStats = await Promise.all(statsPromises);
    allStats.forEach(stat => {
      quizStats.set(stat.quizId, {
        correct: stat.correct,
        total: stat.total,
        rotation: stat.rotation
      });
    });

  } catch (error) {
    console.error("Database error in previous tests:", error);
    quizzes = [];
  }

  const rows: ScoreRow[] = quizzes.map((quiz) => {
    const stats = quizStats.get(quiz.id);
    const correct = stats?.correct || 0;
    const answered = stats?.total || 0;
    const scorePercent = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const rotationLabel = stats?.rotation || "General";

    const shortId = quiz.id.slice(0, 6).toUpperCase();
    const baseColor = pickScoreColor(scorePercent);
    const accentColor = lightenHex(baseColor, 0.45);

    return {
      id: quiz.id,
      shortId,
      status: quiz.status,
      createdAt: quiz.createdAt,
      questionCount: quiz._count.items, // Use _count instead of items.length
      rotationLabel,
      scorePercent,
      scoreBackground: `linear-gradient(135deg, ${baseColor}, ${accentColor})`,
    };
  });

  return (
    <Shell title="Your Previous Tests" pageName="Previous Tests">
      <div className="overflow-x-auto bg-white rounded-xl border-2 border-primary">
        <table className="min-w-full">
          <thead className="theme-gradient text-white">
              <tr>
                <th className="py-4 px-6 text-left font-semibold">Score</th>
                <th className="py-4 px-6 text-left font-semibold">Status</th>
                <th className="py-4 px-6 text-left font-semibold">Created</th>
                <th className="py-4 px-6 text-left font-semibold">Test ID</th>
                <th className="py-4 px-6 text-left font-semibold">Test Name</th>
                <th className="py-4 px-6 text-left font-semibold"># of Qs</th>
                <th className="py-4 px-6 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`transition-colors duration-200 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                >
                  <td className="py-4 px-6">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-white font-bold text-sm"
                      style={{ background: row.scoreBackground }}
                    >
                      {row.scorePercent}%
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      row.status === "Ended" 
                        ? "bg-green-100 text-green-700" 
                        : row.status === "Suspended"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {row.status || "Unknown"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-primary">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-border text-primary">
                      {row.shortId}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-primary">{`Test ${row.rotationLabel}`}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-primary">{row.questionCount}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "Suspended" ? (
                        <Link
                          href={`/year4/quiz/${row.id}`}
                          className="px-3 py-1 rounded-full theme-gradient text-white text-sm font-medium hover:opacity-90 transition-all duration-200"
                          title="Resume Test"
                        >
                          Resume
                        </Link>
                      ) : (
                        <Link
                          href={`/year4/quiz/${row.id}`}
                          className="px-3 py-1 rounded-full theme-gradient text-white text-sm font-medium hover:opacity-90 transition-all duration-200"
                          title="Review Test"
                        >
                          View
                        </Link>
                      )}
                      {row.status === "Ended" && (
                        <>
                          <Link
                            href={`/year4/quiz/${row.id}/results`}
                            className="px-3 py-1 rounded-full theme-gradient text-white text-sm font-medium hover:opacity-90 transition-all duration-200"
                            title="Results"
                          >
                            Results
                          </Link>
                          <Link
                            href={`/year4/quiz/${row.id}/analysis`}
                            className="px-3 py-1 rounded-full theme-gradient text-white text-sm font-medium hover:opacity-90 transition-all duration-200"
                            title="Analysis"
                          >
                            Analysis
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="py-12 text-center text-gray-500 text-lg" colSpan={7}>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full theme-gradient flex items-center justify-center text-white text-sm font-semibold">
                        <div className="text-center leading-tight">
                          No<br />tests<br />yet
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">Create your first test to get started!</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </Shell>
  );
}
