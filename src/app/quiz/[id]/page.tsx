// src/app/quiz/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";

type PageProps = {
  params: { id: string };
};

export default async function QuizItemPage({ params }: PageProps) {
  const id = params.id;

  // Fetch the quiz with items & questions
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { order: "asc" }, // if you have an 'order' field
        include: {
          question: {
            include: {
              choices: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    notFound();
  }

  const current = quiz.items?.[0];

  return (
    <div className="min-h-screen bg-[#F7FBFF]">
      {/* Top bar for the quiz page */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#E6F0F7]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-[#2F6F8F]">
            {current ? (
              <>Item 1 / {quiz.items.length}</>
            ) : (
              <>No items in this quiz</>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/quiz/new"
              className="rounded-2xl border border-[#E6F0F7] px-3 py-1.5 hover:bg-[#F3F9FC] text-[#2F6F8F]"
            >
              End Block
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {!current ? (
          <div className="rounded-2xl border border-[#E6F0F7] bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-[#2F6F8F]">
              This quiz doesn’t have any items yet.
            </h2>
            <p className="mt-2 text-slate-700">
              Go back and create a test block first.
            </p>
            <div className="mt-6">
              <Link
                href="/quiz/new"
                className="inline-flex rounded-2xl bg-[#7DB8D9] px-5 py-2.5 font-semibold text-white hover:bg-[#56A2CD] shadow"
              >
                Back to Create
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl leading-8 mb-6 text-slate-900">
              {current.question.stem}
            </h1>

            <div className="space-y-3">
              {current.question.choices
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border border-[#E6F0F7] bg-white px-4 py-3"
                  >
                    <div className="h-5 w-5 rounded-full border border-[#A5CDE4] text-[#2F6F8F] flex items-center justify-center text-sm">
                      {c.label}
                    </div>
                    <div className="text-slate-900">{c.text}</div>
                  </div>
                ))}
            </div>

            <div className="mt-8">
              <Link
                href="/quiz/new"
                className="inline-flex rounded-2xl bg-[#7DB8D9] px-5 py-2.5 font-semibold text-white hover:bg-[#56A2CD] shadow"
              >
                Back to Create
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
