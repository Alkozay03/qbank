// src/app/year3/reset/page.tsx
export const dynamic = "force-dynamic";

import Shell from "@/components/Shell";

export default async function Reset() {
  return (
    <Shell title="Reset Progress" pageName="Reset">
      <div className="rounded-2xl bg-primary-light border-2 border-primary p-8 shadow-lg">
        <div className="bg-white rounded-xl shadow-inner p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">🚧 Under Construction</h2>
          <p className="text-foreground mb-4">
            The Reset page for Year 3 is currently being developed.
          </p>
          <p className="text-foreground/70">
            This page will allow you to reset your question history and start fresh.
          </p>
        </div>
      </div>
    </Shell>
  );
}
