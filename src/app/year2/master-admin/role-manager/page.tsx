export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { hasElevatedAdminPrivileges } from "@/lib/website-creator";
import RoleManagerClient from "./client";

export default async function RoleManager() {
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
    redirect("/year2");
  }

  // Temporarily allow any MASTER_ADMIN user for debugging
  // TODO: Re-enable email restriction after fixing role assignment
  
  // For now, just check if user has MASTER_ADMIN role
  // if (email === "u21103000@sharjah.ac.ae") {
  //   // Allow access - you are the authorized master admin
  // } else {
  //   // Deny access to anyone else
  //   redirect("/year4");
  // }

  return <RoleManagerClient />;
}
