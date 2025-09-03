/* eslint-disable @typescript-eslint/no-require-imports, no-console */
// prisma/seed.cjs
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  // Base rotations (safe to re-run)
  await db.rotation.createMany({
    data: [
      { name: "Internal Medicine" },
      { name: "General Surgery" },
      { name: "Pediatrics" },
      { name: "Obstetrics and Gynecology" },
    ],
    skipDuplicates: true,
  });

  // Master Admin (change email if you want)
  await db.user.upsert({
    where: { email: "u21103000@sharjah.ac.ae" },
    update: { role: "Admin", name: "Master Admin" },
    create: { email: "u21103000@sharjah.ac.ae", role: "Admin", name: "Master Admin" },
  });

  console.log("✅ Seed complete");
}

main()
  .then(async () => { await db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });