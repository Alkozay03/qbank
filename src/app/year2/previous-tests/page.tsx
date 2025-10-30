// src/app/year1/previous-tests/page.tsx
export const dynamic = "force-dynamic";

import Shell from "@/components/Shell";

export default async function PreviousTests() {
  return (
    <Shell title="Previous Tests" pageName="Previous Tests">
      <div className="rounded-2xl bg-primary-light border-2 border-primary p-8 shadow-lg">
        <div className="bg-white rounded-xl shadow-inner p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">🚧 Under Construction</h2>
          <p className="text-foreground mb-4">
            The Previous Tests page for Year 1 is currently being developed.
          </p>
          <p className="text-foreground/70">
            This page will allow you to review your completed practice tests and performance history.
          </p>
        </div>
      </div>
    </Shell>
  );
}
