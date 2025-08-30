import Link from "next/link";
import { db } from "@/lib/db";

export default async function RotationBank({ params }: { params: { rotationId: string } }) {
  const rotation = await db.rotation.findUnique({ where: { id: params.rotationId } });

  const questions = await db.question.findMany({
  where: { rotationId: params.rotationId, status: "Published" }, // ✅ correct enum string
  include: {
    choices: { select: { id: true, label: true, text: true, isCorrect: true } },
    explanation: true,
  },
  orderBy: { createdAt: "desc" },
});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{rotation?.name ?? "Rotation"}</h1>
        <Link
          href={`/quiz/new?rotationId=${params.rotationId}`}
          className="rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
        >
          Start Quiz
        </Link>
      </div>

      {!questions.length ? (
        <p className="p-3">No questions yet for this rotation.</p>
      ) : (
        <div className="grid gap-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="border rounded p-4">
              <p className="mb-3"><strong>Q{idx + 1}.</strong> {q.stem}</p>
              <div className="space-y-1">
                {q.choices.sort((a,b)=>a.label.localeCompare(b.label)).map((c) => (
                  <div key={c.id}><strong>{c.label}.</strong> {c.text}</div>
                ))}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer">Explanation</summary>
                <div className="mt-2 text-sm text-gray-600">{q.explanation?.text}</div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
