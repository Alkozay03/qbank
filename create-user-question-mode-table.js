// Script to create UserQuestionMode table
import { PrismaClient } from "@prisma/client";

// Use direct connection for DDL operations
const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});

async function createUserQuestionModeTable() {
  try {
    console.log("Creating UserQuestionMode table...");
    console.log("Using connection:", directUrl?.substring(0, 50) + "...");
    
    // Create the table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserQuestionMode" (
        "userId" TEXT NOT NULL,
        "questionId" TEXT NOT NULL,
        "mode" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserQuestionMode_pkey" PRIMARY KEY ("userId", "questionId")
      );
    `);
    
    console.log("✓ Table created");
    
    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_userquestionmode_userid" ON "UserQuestionMode"("userId");
    `);
    console.log("✓ Index idx_userquestionmode_userid created");
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_userquestionmode_questionid" ON "UserQuestionMode"("questionId");
    `);
    console.log("✓ Index idx_userquestionmode_questionid created");
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_userquestionmode_userid_mode" ON "UserQuestionMode"("userId", "mode");
    `);
    console.log("✓ Index idx_userquestionmode_userid_mode created");
    
    // Add foreign keys (these might fail if already exist, that's ok)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "UserQuestionMode" 
          ADD CONSTRAINT "UserQuestionMode_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log("✓ Foreign key to User added");
    } catch (e) {
      console.log("⚠ Foreign key to User already exists (or error):", e.message);
    }
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "UserQuestionMode" 
          ADD CONSTRAINT "UserQuestionMode_questionId_fkey" 
          FOREIGN KEY ("questionId") REFERENCES "Question"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log("✓ Foreign key to Question added");
    } catch (e) {
      console.log("⚠ Foreign key to Question already exists (or error):", e.message);
    }
    
    console.log("\n✅ UserQuestionMode table created successfully!");
    
  } catch (error) {
    console.error("❌ Error creating table:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserQuestionModeTable();
