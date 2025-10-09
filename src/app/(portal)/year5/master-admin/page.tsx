export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { hasElevatedAdminPrivileges, isWebsiteCreator } from "@/lib/website-creator";

export default async function MasterAdminHub() {
  // Only allow access to WEBSITE_CREATOR and MASTER_ADMIN
  const session = await auth();
  const email = session?.user?.email;
  
  if (!email) {
    redirect("/login");
  }

  // Verify that the user has elevated admin privileges
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!user || !hasElevatedAdminPrivileges(user.role)) {
    redirect("/year5");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <h1 className="text-3xl font-bold text-[#0ea5e9]">Master Admin Settings</h1>
      <p className="mt-2 text-slate-600">Manage user roles, system administration, and advanced settings.</p>
      
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card href="/year5/master-admin/role-manager" label="Role Manager" description="Manage user roles and permissions" />
        <Card href="/year5/master-admin/user-list" label="User List" description="View and manage all users" />
        {isWebsiteCreator(email) && (
          <Card href="/year5/master-admin/live-users" label="🔴 Live Users" description="View currently online users" />
        )}
        <Card href="/year5/admin/similar-questions" label="⚠️ Similar Questions Alert" description="Review and manage questions with high similarity" />
        <Card href="/year5/admin/bulk-question-manager" label="Bulk Question Manager" description="Upload PDFs and manage multiple questions with references and tags" />
        <Card href="/year5/admin/view-questions" label="View Questions" description="Filter existing questions and open them for editing" />
        {/* Manual Question Management page removed */}
        <Card href="/year5/admin/tags" label="Tag Management" description="Manage question tags and categories" />
        <Card href="/year5/admin/schedule" label="Schedule Management" description="Set up and manage weekly schedules" />
        <Card href="/year5/admin/notifications" label="Notification Manager" description="Create and manage system notifications" />
        <Card href="/year5/master-admin/help-editor" label="Help Page Editor" description="Manage help content and FAQs for users" />
        <Card href="/year5" label="Year 5 Portal" description="Return to main Year 5 portal" />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-[#0ea5e9]">System Status</h2>
        <div className="mt-3 bg-white p-6 rounded-xl border border-sky-200 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusCard title="Database" status="Healthy" />
            <StatusCard title="Storage" status="Healthy" />
            <StatusCard title="API" status="Healthy" />
          </div>
        </div>
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
  description: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-white p-5 opacity-60 shadow">
        <div className="text-lg font-semibold text-[#0ea5e9]">{label}</div>
        <div className="mt-1 text-sm text-slate-600">{description}</div>
      </div>
    );
  }

  return (
    <Link href={href} className="rounded-2xl border border-sky-200 bg-white p-5 shadow-md hover:shadow-xl hover:border-sky-300 hover:bg-sky-50 transition-all duration-200">
      <div className="text-lg font-semibold text-[#0ea5e9]">{label}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
    </Link>
  );
}

function StatusCard({ title, status }: { title: string; status: string }) {
  const isHealthy = status === "Healthy";
  
  return (
    <div className="flex justify-between items-center">
      <div className="font-semibold text-[#0284c7]">{title}</div>
      <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
        {status}
      </div>
    </div>
  );
}
