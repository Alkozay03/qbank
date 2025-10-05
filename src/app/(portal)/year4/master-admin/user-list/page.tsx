export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import UserListClient from "./client";
import ForceBlueTheme from "@/components/ForceBlueTheme";

export default async function UserList() {
  // Only allow access to MASTER_ADMIN with specific email
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

  return (
    <ForceBlueTheme>
      <UserListClient users={users} />
    </ForceBlueTheme>
  );
}
