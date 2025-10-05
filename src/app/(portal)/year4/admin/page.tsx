export const dynamic = "force-dynamic";
import Link from "next/link";
import ForceBlueTheme from "@/components/ForceBlueTheme";

export default async function Year4AdminHub() {
  return (
    <ForceBlueTheme>
      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-primary">Year 4 Admin Portal</h1>
      <p className="mt-2 text-secondary">Manage schedules, questions, and notifications for Year 4.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card href="/year4/admin/bulk-question-manager" label="Bulk Question Manager" description="Upload PDFs and manage multiple questions with references and tags" />
        <Card href="/year4/admin/view-questions" label="View Questions" description="Filter existing questions and jump into edits" />
        <Card href="/year4/admin/schedule-editor" label="Schedule Editor" description="Create and manage weekly schedules" />
        {/* Manual Question Builder removed; use AI builder for bulk import */}
        <Card href="/year4/admin/notifications" label="Notifications Editor" description="Create and manage system notifications" />
        <Card href="/year4/admin/tags" label="Tag Manager" description="Manage question tags and categories" />
        <Card href="/year4" label="Year 4 Portal" description="Return to main Year 4 portal" />
      </div>
      </div>
    </ForceBlueTheme>
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
        <div className="mt-1 text-sm text-readable-light">{description}</div>
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
