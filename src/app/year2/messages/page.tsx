// src/app/year2/messages/page.tsx
export const dynamic = "force-dynamic";

import Shell from "@/components/Shell";

export default async function Messages() {
  return (
    <Shell title="Messages & Notifications" pageName="Messages">
      <div className="rounded-2xl bg-primary-light border-2 border-primary p-8 shadow-lg">
        <div className="bg-white rounded-xl shadow-inner p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">🚧 Under Construction</h2>
          <p className="text-foreground mb-4">
            The Messages page for Year 2 is currently being developed.
          </p>
          <p className="text-foreground/70">
            This page will allow you to receive and view messages from instructors and administrators.
          </p>
        </div>
      </div>
    </Shell>
  );
}
