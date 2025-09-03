export const dynamic = "force-dynamic";
import Link from "next/link";

export default async function Year4AdminHub() {
  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-[#2F6F8F]">Year 4 Portal Settings</h1>
      <p className="mt-2 text-slate-600">Manage schedules, questions, and notifications for Year 4.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card href="/year4/admin/schedule-editor" label="Schedule Editor" />
        <Card href="/year4/admin/questions" label="Question Builder" />
        <Card href="/year4/admin/notifications" label="Notifications Editor" />
        <Card href="/year4" label="Year 4 Portal" />
      </div>
    </div>
  );
}

function Card({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-[#E6F0F7] bg-white p-5 shadow hover:bg-[#F3F9FC]">
      <div className="text-lg font-semibold text-[#2F6F8F]">{label}</div>
    </Link>
  );
}