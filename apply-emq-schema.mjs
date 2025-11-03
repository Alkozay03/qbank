import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyEMQSchema() {
  try {
    console.log('🔧 Applying EMQ schema changes...\n');

    // 1. Create QuestionType enum
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'EMQ');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ QuestionType enum created');

    // 2. Add new columns to Question table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Question" 
      ADD COLUMN IF NOT EXISTS "questionType" "QuestionType" DEFAULT 'MCQ',
      ADD COLUMN IF NOT EXISTS "emqTheme" TEXT,
      ADD COLUMN IF NOT EXISTS "emqOptions" JSONB;
    `);
    console.log('✅ Added questionType, emqTheme, emqOptions to Question');

    // 3. Add new columns to Choice table (for EMQ stems)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Choice" 
      ADD COLUMN IF NOT EXISTS "stemImageUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "correctOptionIds" JSONB;
    `);
    console.log('✅ Added stemImageUrl, correctOptionIds to Choice');

    // 4. Create index on questionType
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_question_type" ON "Question"("questionType");
    `);
    console.log('✅ Created index on questionType');

    console.log('\n🎉 EMQ schema changes applied successfully!');
  } catch (error) {
    console.error('❌ Error applying schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyEMQSchema();
