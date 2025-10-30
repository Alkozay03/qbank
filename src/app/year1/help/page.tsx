// src/app/year1/help/page.tsx
export const dynamic = "force-dynamic";

import Shell from "@/components/Shell";

export default async function Help() {
  return (
    <Shell title="Help & Support" pageName="Help">
      <div className="rounded-2xl bg-primary-light border-2 border-primary p-8 shadow-lg">
        <div className="bg-white rounded-xl shadow-inner p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">🚧 Under Construction</h2>
          <p className="text-foreground mb-4">
            The Help page for Year 1 is currently being developed.
          </p>
          <p className="text-foreground/70">
            This page will provide tutorials, FAQs, and support resources for using the Year 1 question bank.
          </p>
        </div>
      </div>
    </Shell>
  );
}
