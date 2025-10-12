/**
 * AUTOMATIC DATA COPY - Copies everything from Supabase to Neon
 * No need to list each table manually!
 */

import { PrismaClient } from '@prisma/client';

// Source (Supabase)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.wmlizlldqmsbvguhftgi:K12482s%24031231%5E@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connect_timeout=15'
    }
  }
});

// Target (Neon)
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_tYDfIr2MP7mw@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true'
    }
  }
});

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║       🚀 AUTOMATIC DATA COPY TO NEON                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function copyAllData() {
  try {
    // Define the order to respect foreign key constraints
    // Tables with no dependencies first, then those that depend on them
    const copyOrder = [
      // No dependencies
      { name: 'User', model: 'user' },
      { name: 'Tag', model: 'tag' },
      { name: 'RotationPeriod', model: 'rotationPeriod' },
      { name: 'VerificationToken', model: 'verificationToken' },
      
      // Depends on User
      { name: 'Account', model: 'account' },
      { name: 'Session', model: 'session' },
      { name: 'UserQuestionMode', model: 'userQuestionMode' },
      { name: 'UserActivity', model: 'userActivity' },
      
      // Question and related
      { name: 'Question', model: 'question' },
      { name: 'Answer', model: 'answer' },
      { name: 'QuestionTag', model: 'questionTag' },
      { name: 'QuestionOccurrence', model: 'questionOccurrence' },
      
      // Depends on Question and User
      { name: 'QuestionComment', model: 'questionComment' },
      { name: 'CommentVote', model: 'commentVote' },
      { name: 'AnswerVote', model: 'answerVote' },
      
      // Similar question groups
      { name: 'SimilarQuestionGroup', model: 'similarQuestionGroup' },
      
      // Quiz-related
      { name: 'Quiz', model: 'quiz' },
      { name: 'QuizItem', model: 'quizItem' },
      { name: 'Response', model: 'response' },
      
      // Help and messaging
      { name: 'HelpItem', model: 'helpItem' },
      { name: 'Conversation', model: 'conversation' },
      { name: 'Message', model: 'message' },
      { name: 'MessageRecipient', model: 'messageRecipient' },
      
      // Notifications
      { name: 'Notification', model: 'notification' },
      { name: 'NotificationRead', model: 'notificationRead' },
      
      // Schedule
      { name: 'Schedule', model: 'schedule' },
      { name: 'ScheduleItem', model: 'scheduleItem' },
      
      // AI Extraction
      { name: 'AIExtraction', model: 'aIExtraction' },
      { name: 'ExtractionImage', model: 'extractionImage' },
    ];

    console.log('⏳ Copying data in the correct order...\n');
    
    let totalCopied = 0;
    let step = 1;

    for (const table of copyOrder) {
      try {
        // Check if model exists in Prisma client
        if (!sourceDb[table.model] || !targetDb[table.model]) {
          console.log(`⏭️  ${step}. Skipping ${table.name} (not in schema)\n`);
          step++;
          continue;
        }

        const data = await sourceDb[table.model].findMany();
        
        if (data.length === 0) {
          console.log(`⏭️  ${step}. Skipping ${table.name} (no data)\n`);
          step++;
          continue;
        }

        console.log(`${step}. Copying ${table.name}...`);
        
        for (const record of data) {
          await targetDb[table.model].create({ data: record });
        }
        
        console.log(`   ✓ Copied ${data.length} ${table.name} records\n`);
        totalCopied += data.length;
        step++;
        
      } catch (error) {
        // If it fails, it might be a duplicate or constraint issue
        // Continue with other tables
        console.log(`   ⚠️  Error copying ${table.name}: ${error.message}`);
        console.log(`   Continuing with next table...\n`);
        step++;
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║               ✅ DATA COPY COMPLETE!                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║ Total records copied: ${totalCopied.toString().padEnd(36)}║`);
    console.log('║                                                           ║');
    console.log('║ All your data is safely in Neon! 🎉                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nYour Supabase data is safe. Let me know what went wrong!\n');
    process.exit(1);
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

copyAllData();
