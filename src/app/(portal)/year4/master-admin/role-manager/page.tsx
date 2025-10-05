export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import RoleManagerClient from "./client";
import ForceBlueTheme from "@/components/ForceBlueTheme";

export default async function RoleManager() {
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

  // Temporarily allow any MASTER_ADMIN user for debugging
  // TODO: Re-enable email restriction after fixing role assignment
  
  // For now, just check if user has MASTER_ADMIN role
  // if (email === "u21103000@sharjah.ac.ae") {
  //   // Allow access - you are the authorized master admin
  // } else {
  //   // Deny access to anyone else
  //   redirect("/year4");
  // }

  return (
    <ForceBlueTheme>
      <RoleManagerClient />
    </ForceBlueTheme>
  );
}
