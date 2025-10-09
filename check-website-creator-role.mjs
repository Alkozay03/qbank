// Check current role for website creator
import { prisma } from "./src/server/db.ts";

async function checkRole() {
  const user = await prisma.user.findUnique({
    where: { email: "u21103000@sharjah.ac.ae" },
    select: { email: true, role: true, approvalStatus: true },
  });
  
  console.log("Current user data:", user);
  
  // Update to WEBSITE_CREATOR if not already
  if (user && user.role !== "WEBSITE_CREATOR") {
    console.log(`\nUpdating role from ${user.role} to WEBSITE_CREATOR...`);
    await prisma.user.update({
      where: { email: "u21103000@sharjah.ac.ae" },
      data: { role: "WEBSITE_CREATOR" },
    });
    console.log("✅ Role updated successfully!");
  } else {
    console.log("✅ Role is already WEBSITE_CREATOR");
  }
  
  await prisma.$disconnect();
}

checkRole().catch(console.error);
