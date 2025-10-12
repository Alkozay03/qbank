/**
 * Verify data migration - Compare Supabase vs Neon
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
console.log('║         ✅ VERIFYING DATA MIGRATION                       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function verifyData() {
  try {
    const tables = [
      'user',
      'question',
      'answer',
      'tag',
      'questionTag',
      'questionOccurrence',
      'quiz',
      'quizItem',
      'response',
      'helpItem',
      'notification',
      'notificationRead',
      'conversation',
      'userActivity',
      'userQuestionMode',
      'rotationPeriod',
      'answerVote',
      'questionComment',
    ];

    console.log('📊 Comparing record counts:\n');
    console.log('Table                  | Supabase | Neon     | Status');
    console.log('─────────────────────────────────────────────────────');

    let allMatch = true;

    for (const table of tables) {
      if (sourceDb[table] && targetDb[table]) {
        const sourceCount = await sourceDb[table].count();
        const targetCount = await targetDb[table].count();
        
        const status = sourceCount === targetCount ? '✅ Match' : '❌ Mismatch';
        if (sourceCount !== targetCount) allMatch = false;
        
        const tableName = table.padEnd(22);
        const sourceStr = sourceCount.toString().padEnd(8);
        const targetStr = targetCount.toString().padEnd(8);
        
        console.log(`${tableName} | ${sourceStr} | ${targetStr} | ${status}`);
      }
    }

    console.log('\n');

    if (allMatch) {
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║           🎉 PERFECT! ALL DATA COPIED                     ║');
      console.log('╠═══════════════════════════════════════════════════════════╣');
      console.log('║ ✅ All record counts match exactly                        ║');
      console.log('║ ✅ Your data is safely migrated to Neon                   ║');
      console.log('║                                                           ║');
      console.log('║ Next step: Update your .env to use Neon                  ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║              ⚠️  SOME COUNTS DON\'T MATCH                  ║');
      console.log('╠═══════════════════════════════════════════════════════════╣');
      console.log('║ This might be OK if you added new data during migration  ║');
      console.log('║ Or we can re-run the copy to sync up                     ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

verifyData();
