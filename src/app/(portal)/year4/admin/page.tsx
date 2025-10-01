export const dynamic = "force-dynamic";
import Link from "next/link";

export default async function Year4AdminHub() {
  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-[#2F6F8F]">Year 4 Admin Portal</h1>
      <p className="mt-2 text-slate-600">Manage schedules, questions, and notifications for Year 4.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          href="/year4/admin/ai-question-builder"
          label="AI Question Builder"
          description="Extract questions from screenshots using advanced AI"
          disabled={!process.env.NEXT_PUBLIC_ENABLE_AI_EXTRACTOR && !process.env.ENABLE_AI_EXTRACTOR}
        />
        <Card href="/year4/admin/bulk-question-manager" label="Bulk Question Manager" description="Upload PDFs and manage multiple questions with references and tags" />
        <Card href="/year4/admin/view-questions" label="View Questions" description="Filter existing questions and jump into edits" />
        <Card href="/year4/admin/schedule-editor" label="Schedule Editor" description="Create and manage weekly schedules" />
        {/* Manual Question Builder removed; use AI builder for bulk import */}
        <Card href="/year4/admin/notifications" label="Notifications Editor" description="Create and manage system notifications" />
        <Card href="/year4/admin/tags" label="Tag Manager" description="Manage question tags and categories" />
        <Card href="/year4" label="Year 4 Portal" description="Return to main Year 4 portal" />
      </div>
    </div>
  );
}

function Card({
  href,
  label,
  description,
  disabled = false,
}: {
  href: string;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="gradient-card p-5 opacity-60">
        <div className="text-lg font-semibold text-readable">{label}</div>
        <div className="mt-1 text-sm text-readable-light">Enable ENABLE_AI_EXTRACTOR in .env.local to use this tool.</div>
      </div>
    );
  }
  return (
    <Link href={href} className="gradient-card p-5 hover:gradient-card">
      <div className="text-lg font-semibold text-readable">{label}</div>
      {description && <div className="mt-1 text-sm text-readable-light">{description}</div>}
    </Link>
  );
}
