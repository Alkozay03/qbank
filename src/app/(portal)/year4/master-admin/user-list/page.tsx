export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { hasElevatedAdminPrivileges } from "@/lib/website-creator";
import UserListClient from "./client";

export default async function UserList() {
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
    redirect("/year4");
  }

  // Fetch all users with approval status
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      approvalStatus: true,
      createdAt: true,
      gradYear: true,
    },
  });

  return <UserListClient users={users} />;
}
