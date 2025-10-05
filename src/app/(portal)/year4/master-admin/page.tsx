export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import ForceBlueTheme from "@/components/ForceBlueTheme";



export default async function MasterAdminHub() {
  // Only allow access to MASTER_ADMIN
  const session = await auth();
  const email = session?.user?.email;
  
  if (!email) {
    redirect("/login");
  }

  // Verify that the user is a MASTER_ADMIN
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!user || user.role !== "MASTER_ADMIN") {
    redirect("/year4");
  }

  return (
    <ForceBlueTheme>
      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-primary">Master Admin Settings</h1>
      <p className="mt-2 text-secondary">Manage user roles, system administration, and advanced settings.</p>
      
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card href="/year4/master-admin/role-manager" label="Role Manager" description="Manage user roles and permissions" />
        <Card href="/year4/master-admin/user-list" label="User List" description="View and manage all users" />
        <Card href="/year4/admin/bulk-question-manager" label="Bulk Question Manager" description="Upload PDFs and manage multiple questions with references and tags" />
        <Card href="/year4/admin/view-questions" label="View Questions" description="Filter existing questions and open them for editing" />
        {/* Manual Question Management page removed */}
        <Card href="/year4/admin/tags" label="Tag Management" description="Manage question tags and categories" />
        <Card href="/year4/admin/schedule" label="Schedule Management" description="Set up and manage weekly schedules" />
        <Card href="/year4/admin/notifications" label="Notification Manager" description="Create and manage system notifications" />
        <Card href="/year4/master-admin/help-editor" label="Help Page Editor" description="Manage help content and FAQs for users" />
        <Card href="/year4" label="Year 4 Portal" description="Return to main Year 4 portal" />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-primary">System Status</h2>
        <div className="mt-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusCard title="Database" status="Healthy" />
            <StatusCard title="Storage" status="Healthy" />
            <StatusCard title="API" status="Healthy" />
          </div>
        </div>
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
  description: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 opacity-60">
        <div className="text-lg font-semibold text-primary">{label}</div>
        <div className="mt-1 text-sm text-secondary">{description}</div>
      </div>
    );
  }

  return (
    <Link href={href} className="rounded-2xl border border-border bg-card p-5 shadow hover:bg-accent">
      <div className="text-lg font-semibold text-primary">{label}</div>
      <div className="mt-1 text-sm text-secondary">{description}</div>
    </Link>
  );
}

function StatusCard({ title, status }: { title: string; status: string }) {
  const isHealthy = status === "Healthy";
  
  return (
    <div className="flex justify-between items-center">
      <div className="font-medium">{title}</div>
      <div className={`px-2 py-1 rounded text-sm ${isHealthy ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
        {status}
      </div>
    </div>
  );
}
