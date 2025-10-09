export const dynamic = "force-dynamic";
import Link from "next/link";

export default async function Year4AdminHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
          <h1 className="text-2xl font-bold text-[#0ea5e9]">Year 4 Admin Portal</h1>
          <p className="mt-2 text-[#0284c7]">Manage schedules, questions, and notifications for Year 4.</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card href="/year4/admin/bulk-question-manager" label="Bulk Question Manager" description="Upload PDFs and manage multiple questions with references and tags" />
            <Card href="/year4/admin/view-questions" label="View Questions" description="Filter existing questions and jump into edits" />
            <Card href="/year4/admin/similar-questions" label="⚠️ Similar Questions Alert" description="Review and manage questions with high similarity" />
            <Card href="/year4/admin/schedule-editor" label="Schedule Editor" description="Create and manage weekly schedules" />
            <Card href="/year4/admin/rotation-schedule" label="Rotation Schedule Manager" description="Manage rotation periods and voting schedules" />
            {/* Manual Question Builder removed; use AI builder for bulk import */}
            <Card href="/year4/admin/notifications" label="Notifications Editor" description="Create and manage system notifications" />
            {/* Tag Manager hidden from Year 4 Admin - only accessible from Master Admin */}
            <Card href="/year4" label="Year 4 Portal" description="Return to main Year 4 portal" />
          </div>
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
      <div className="rounded-xl border border-sky-200 bg-white p-5 opacity-60 shadow">
        <div className="text-lg font-semibold text-slate-800">{label}</div>
        <div className="mt-1 text-sm text-slate-600">{description}</div>
      </div>
    );
  }
  return (
    <Link href={href} className="block rounded-xl border border-sky-200 bg-white p-5 shadow-md hover:shadow-lg hover:border-[#0ea5e9] hover:bg-sky-50 transition-all">
      <div className="text-lg font-semibold text-[#0ea5e9]">{label}</div>
      {description && <div className="mt-1 text-sm text-[#0284c7]">{description}</div>}
    </Link>
  );
}
