// src/app/year3/schedule/page.tsx
export const dynamic = "force-dynamic";

import Shell from "@/components/Shell";

export default async function Schedule() {
  return (
    <Shell title="Study Schedule" pageName="Schedule">
      <div className="rounded-2xl bg-primary-light border-2 border-primary p-8 shadow-lg">
        <div className="bg-white rounded-xl shadow-inner p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">🚧 Under Construction</h2>
          <p className="text-foreground mb-4">
            The Schedule page for Year 3 is currently being developed.
          </p>
          <p className="text-foreground/70">
            This page will help you organize your study schedule and track your weekly progress.
          </p>
        </div>
      </div>
    </Shell>
  );
}
