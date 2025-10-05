import { Suspense } from "react";
import Shell from "@/components/Shell";
import NotificationsTable from "./NotificationsTable";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications | QBank",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  
  return (
    <Shell title="Stay Updated!" pageName="Notifications">
      <div className="container px-4 py-6 mx-auto max-w-6xl">
        <div className="bg-primary-light rounded-xl shadow-sm overflow-hidden">
          <Suspense fallback={<NotificationsTableSkeleton />}>
            <NotificationsTable />
          </Suspense>
        </div>
      </div>
    </Shell>
  );
}

function NotificationsTableSkeleton() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded"></div>
        <div className="animate-pulse h-10 w-32 bg-gray-200 rounded"></div>
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
