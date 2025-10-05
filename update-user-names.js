// Script to update existing users with their first and last names
// Run this with: node update-user-names.js

const { PrismaClient } = require("@prisma/client");
const readline = require("readline");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateUserNames() {
  try {
    // Get all users without names
    const usersWithoutNames = await prisma.user.findMany({
      where: {
        OR: [{ firstName: null }, { lastName: null }],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (usersWithoutNames.length === 0) {
      console.log("✅ All users already have names!");
      rl.close();
      return;
    }

    console.log(`\nFound ${usersWithoutNames.length} user(s) without names:\n`);

    for (const user of usersWithoutNames) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`Current: ${user.firstName || "(no first name)"} ${user.lastName || "(no last name)"}`);

      const firstName = await question("Enter first name: ");
      const lastName = await question("Enter last name: ");

      if (firstName.trim() && lastName.trim()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
        });
        console.log(`✅ Updated: ${firstName.trim()} ${lastName.trim()}`);
      } else {
        console.log("⏭️  Skipped (empty input)");
      }
    }

    console.log("\n✅ All done!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

updateUserNames();
