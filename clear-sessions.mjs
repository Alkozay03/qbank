// Clear sessions for website creator to force re-login
import { prisma } from "./src/server/db.ts";

async function clearSessions() {
  const user = await prisma.user.findUnique({
    where: { email: "u21103000@sharjah.ac.ae" },
    select: { id: true, email: true },
  });
  
  if (!user) {
    console.error("User not found!");
    return;
  }
  
  console.error(`Clearing sessions for ${user.email}...`);
  
  const result = await prisma.session.deleteMany({
    where: { userId: user.id },
  });
  
  console.error(`✅ Deleted ${result.count} session(s)`);
  console.error("\nNow:");
  console.error("1. Refresh your browser");
  console.error("2. You'll be logged out");
  console.error("3. Log back in");
  console.error("4. Your role will be WEBSITE_CREATOR");
  
  await prisma.$disconnect();
}

clearSessions().catch(console.error);
