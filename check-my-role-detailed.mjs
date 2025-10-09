// Check detailed role information
import { prisma } from "./src/server/db.ts";

async function checkRole() {
  console.log("🔍 Checking role for u21103000@sharjah.ac.ae\n");
  
  const user = await prisma.user.findUnique({
    where: { email: "u21103000@sharjah.ac.ae" },
    select: { 
      id: true,
      email: true, 
      role: true, 
      approvalStatus: true,
      firstName: true,
      lastName: true,
    },
  });
  
  if (!user) {
    console.error("❌ User not found!");
    return;
  }
  
  console.log("✅ User found:");
  console.log(JSON.stringify(user, null, 2));
  console.log("\n📊 Role details:");
  console.log(`  Type: ${typeof user.role}`);
  console.log(`  Value: "${user.role}"`);
  console.log(`  Length: ${user.role.length}`);
  console.log(`  Exact match to "WEBSITE_CREATOR": ${user.role === "WEBSITE_CREATOR"}`);
  console.log(`  Exact match to "ADMIN": ${user.role === "ADMIN"}`);
  console.log(`  Exact match to "MASTER_ADMIN": ${user.role === "MASTER_ADMIN"}`);
  
  // Check if role is in the database enum
  console.log("\n🔧 Testing role normalization:");
  const testRoles = ["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"];
  for (const role of testRoles) {
    const matches = user.role === role;
    console.log(`  ${role}: ${matches ? "✅" : "❌"}`);
  }
  
  await prisma.$disconnect();
}

checkRole().catch(console.error);
