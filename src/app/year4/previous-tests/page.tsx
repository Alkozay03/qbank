// src/app/year4/previous-tests/page.tsx
export const dynamic = "force-dynamic";

import Shell from "@/components/Shell";
import { auth } from "@/auth";
import db from "@/lib/db";
import Link from "next/link";

type ScoreRow = {
  id: string;
  shortId: string;
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
  const email = session?.user?.email ?? null;

  let userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  if (!userId && email) {
    const userRecord = await db.user.findUnique({ where: { email }, select: { id: true } });
    userId = userRecord?.id ?? null;
  }

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

  const quizzes = await db.quiz.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          question: {
            select: {
              questionTags: {
                select: {
                  tag: { select: { type: true, value: true } },
                },
              },
            },
          },
          responses: {
            orderBy: { createdAt: "asc" },
            select: { createdAt: true, choiceId: true, isCorrect: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const rows: ScoreRow[] = quizzes.map((quiz) => {
    let answered = 0;
    let correct = 0;

    quiz.items.forEach((item) => {
      const latest = item.responses[0];
      if (latest && latest.choiceId) {
        answered += 1;
        if (latest.isCorrect === true) {
          correct += 1;
        }
      }
    });

    const scorePercent = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    const rotationTag = quiz.items
      .flatMap((item) => item.question?.questionTags ?? [])
      .find((entry) => entry.tag.type === "ROTATION");
    const rotationLabel = rotationTag?.tag.value ?? "General";

    const shortId = quiz.id.slice(0, 6).toUpperCase();
    const baseColor = pickScoreColor(scorePercent);
    const accentColor = lightenHex(baseColor, 0.45);

    return {
      id: quiz.id,
      shortId,
      createdAt: quiz.createdAt,
      questionCount: quiz.items.length,
      rotationLabel,
      scorePercent,
      scoreBackground: `linear-gradient(135deg, ${baseColor}, ${accentColor})`,
    };
  });

  return (
    <Shell title="Your Previous Tests" pageName="Previous Tests">
      <div className="rounded-2xl bg-gradient-to-br from-white to-[#F8FCFF] border border-[#E6F0F7] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white">
              <tr>
                <th className="py-4 px-6 text-left font-semibold">Score</th>
                <th className="py-4 px-6 text-left font-semibold">Created</th>
                <th className="py-4 px-6 text-left font-semibold">Test ID</th>
                <th className="py-4 px-6 text-left font-semibold">Test Name</th>
                <th className="py-4 px-6 text-left font-semibold"># of Qs</th>
                <th className="py-4 px-6 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#2F6F8F]">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`transition-colors duration-200 hover:bg-gradient-to-r hover:from-[#A5CDE4]/20 hover:to-[#56A2CD]/10 ${index % 2 === 0 ? "bg-white/50" : "bg-[#F8FCFF]/50"}`}
                >
                  <td className="py-4 px-6">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-white font-bold text-sm"
                      style={{ background: row.scoreBackground }}
                    >
                      {row.scorePercent}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-700">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-xs bg-[#F8FCFF] px-2 py-1 rounded border border-[#E6F0F7]">
                      {row.shortId}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium">{`Test ${row.rotationLabel}`}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-[#2F6F8F]">{row.questionCount}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/quiz/${row.id}`}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-[#3B82A0] to-[#2F6F8F] text-white text-sm font-medium hover:from-[#2F6F8F] hover:to-[#56A2CD] transition-all duration-200"
                        title="Open / Review"
                      >
                        View
                      </Link>
                      <Link
                        href={`/quiz/${row.id}/results`}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white text-sm font-medium hover:from-[#56A2CD] hover:to-[#A5CDE4] transition-all duration-200"
                        title="Results"
                      >
                        Results
                      </Link>
                      <Link
                        href={`/quiz/${row.id}/analysis`}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-[#56A2CD] to-[#A5CDE4] text-white text-sm font-medium hover:from-[#A5CDE4] hover:to-[#7DB8D9] transition-all duration-200"
                        title="Analysis"
                      >
                        Analysis
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="py-12 text-center text-slate-500 text-lg" colSpan={6}>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#A5CDE4] to-[#56A2CD] flex items-center justify-center text-white text-sm font-semibold">
                        <div className="text-center leading-tight">
                          No<br />tests<br />yet
                        </div>
                      </div>
                      <div className="text-sm text-slate-400">Create your first test to get started!</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
