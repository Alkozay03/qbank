const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearTokens() {
  const result = await prisma.verificationToken.deleteMany();
  console.log(`✅ Deleted ${result.count} verification tokens`);
  await prisma.$disconnect();
}

clearTokens();
