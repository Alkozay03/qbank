/**
 * Copy data from Supabase to Neon
 * This will copy all data in the correct order to respect foreign keys
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
console.log('║           🚀 COPYING DATA TO NEON                         ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function copyData() {
  try {
    console.log('⏳ This will take a few minutes. Please wait...\n');

    // Copy in order respecting foreign keys
    
    // 1. Users (no dependencies)
    console.log('1️⃣  Copying Users...');
    const users = await sourceDb.user.findMany();
    for (const user of users) {
      await targetDb.user.create({ data: user });
    }
    console.log(`   ✓ Copied ${users.length} users\n`);

    // 2. Accounts (depends on User)
    console.log('2️⃣  Copying Accounts...');
    const accounts = await sourceDb.account.findMany();
    for (const account of accounts) {
      await targetDb.account.create({ data: account });
    }
    console.log(`   ✓ Copied ${accounts.length} accounts\n`);

    // 3. Sessions (depends on User)
    console.log('3️⃣  Copying Sessions...');
    const sessions = await sourceDb.session.findMany();
    for (const session of sessions) {
      await targetDb.session.create({ data: session });
    }
    console.log(`   ✓ Copied ${sessions.length} sessions\n`);

    // 4. VerificationTokens (no dependencies)
    console.log('4️⃣  Copying Verification Tokens...');
    const tokens = await sourceDb.verificationToken.findMany();
    for (const token of tokens) {
      await targetDb.verificationToken.create({ data: token });
    }
    console.log(`   ✓ Copied ${tokens.length} tokens\n`);

    // 5. Tags (no dependencies)
    console.log('5️⃣  Copying Tags...');
    const tags = await sourceDb.tag.findMany();
    for (const tag of tags) {
      await targetDb.tag.create({ data: tag });
    }
    console.log(`   ✓ Copied ${tags.length} tags\n`);

    // 6. RotationPeriods (no dependencies)
    console.log('6️⃣  Copying Rotation Periods...');
    const rotations = await sourceDb.rotationPeriod.findMany();
    for (const rotation of rotations) {
      await targetDb.rotationPeriod.create({ data: rotation });
    }
    console.log(`   ✓ Copied ${rotations.length} rotation periods\n`);

    // 7. Questions (no dependencies)
    console.log('7️⃣  Copying Questions...');
    const questions = await sourceDb.question.findMany();
    for (const question of questions) {
      await targetDb.question.create({ data: question });
    }
    console.log(`   ✓ Copied ${questions.length} questions\n`);

    // 8. Choices (depends on Question)
    console.log('8️⃣  Copying Choices...');
    const choices = await sourceDb.choice.findMany();
    for (const choice of choices) {
      await targetDb.choice.create({ data: choice });
    }
    console.log(`   ✓ Copied ${choices.length} choices\n`);

    // 9. QuestionTags (depends on Question, Tag)
    console.log('9️⃣  Copying Question Tags...');
    const questionTags = await sourceDb.questionTag.findMany();
    for (const qt of questionTags) {
      await targetDb.questionTag.create({ data: qt });
    }
    console.log(`   ✓ Copied ${questionTags.length} question tags\n`);

    // 10. QuestionOccurrences (depends on Question)
    console.log('🔟 Copying Question Occurrences...');
    const occurrences = await sourceDb.questionOccurrence.findMany();
    for (const occurrence of occurrences) {
      await targetDb.questionOccurrence.create({ data: occurrence });
    }
    console.log(`   ✓ Copied ${occurrences.length} occurrences\n`);

    // 11. QuestionComments (depends on Question, User)
    console.log('1️⃣1️⃣  Copying Question Comments...');
    const comments = await sourceDb.questionComment.findMany();
    for (const comment of comments) {
      await targetDb.questionComment.create({ data: comment });
    }
    console.log(`   ✓ Copied ${comments.length} comments\n`);

    // 12. AnswerVotes (depends on Question, User)
    console.log('1️⃣2️⃣  Copying Answer Votes...');
    const votes = await sourceDb.answerVote.findMany();
    for (const vote of votes) {
      await targetDb.answerVote.create({ data: vote });
    }
    console.log(`   ✓ Copied ${votes.length} votes\n`);

    // 13. Quizzes (depends on User)
    console.log('1️⃣3️⃣  Copying Quizzes...');
    const quizzes = await sourceDb.quiz.findMany();
    for (const quiz of quizzes) {
      await targetDb.quiz.create({ data: quiz });
    }
    console.log(`   ✓ Copied ${quizzes.length} quizzes\n`);

    // 14. QuizItems (depends on Quiz, Question)
    console.log('1️⃣4️⃣  Copying Quiz Items...');
    const quizItems = await sourceDb.quizItem.findMany();
    for (const item of quizItems) {
      await targetDb.quizItem.create({ data: item });
    }
    console.log(`   ✓ Copied ${quizItems.length} quiz items\n`);

    // 15. Responses (depends on QuizItem, Choice)
    console.log('1️⃣5️⃣  Copying Responses...');
    const responses = await sourceDb.response.findMany();
    for (const response of responses) {
      await targetDb.response.create({ data: response });
    }
    console.log(`   ✓ Copied ${responses.length} responses\n`);

    // 16. HelpItems (depends on User)
    console.log('1️⃣6️⃣  Copying Help Items...');
    const helpItems = await sourceDb.helpItem.findMany();
    for (const item of helpItems) {
      await targetDb.helpItem.create({ data: item });
    }
    console.log(`   ✓ Copied ${helpItems.length} help items\n`);

    // 17. Notifications (depends on User)
    console.log('1️⃣7️⃣  Copying Notifications...');
    const notifications = await sourceDb.notification.findMany();
    for (const notification of notifications) {
      await targetDb.notification.create({ data: notification });
    }
    console.log(`   ✓ Copied ${notifications.length} notifications\n`);

    // 18. NotificationReads (depends on Notification, User)
    console.log('1️⃣8️⃣  Copying Notification Reads...');
    const reads = await sourceDb.notificationRead.findMany();
    for (const read of reads) {
      await targetDb.notificationRead.create({ data: read });
    }
    console.log(`   ✓ Copied ${reads.length} notification reads\n`);

    // 19. Conversations (depends on User)
    console.log('1️⃣9️⃣  Copying Conversations...');
    const conversations = await sourceDb.conversation.findMany();
    for (const conversation of conversations) {
      await targetDb.conversation.create({ data: conversation });
    }
    console.log(`   ✓ Copied ${conversations.length} conversations\n`);

    // 20. Messages (depends on Conversation, User)
    console.log('2️⃣0️⃣  Copying Messages...');
    const messages = await sourceDb.message.findMany();
    for (const message of messages) {
      await targetDb.message.create({ data: message });
    }
    console.log(`   ✓ Copied ${messages.length} messages\n`);

    // 21. MessageRecipients (depends on Message, User)
    console.log('2️⃣1️⃣  Copying Message Recipients...');
    const recipients = await sourceDb.messageRecipient.findMany();
    for (const recipient of recipients) {
      await targetDb.messageRecipient.create({ data: recipient });
    }
    console.log(`   ✓ Copied ${recipients.length} message recipients\n`);

    // 22. UserActivity (depends on User)
    console.log('2️⃣2️⃣  Copying User Activity...');
    const activities = await sourceDb.userActivity.findMany();
    for (const activity of activities) {
      await targetDb.userActivity.create({ data: activity });
    }
    console.log(`   ✓ Copied ${activities.length} activities\n`);

    // 23. UserQuestionMode (depends on User)
    console.log('2️⃣3️⃣  Copying User Question Modes...');
    const modes = await sourceDb.userQuestionMode.findMany();
    for (const mode of modes) {
      await targetDb.userQuestionMode.create({ data: mode });
    }
    console.log(`   ✓ Copied ${modes.length} question modes\n`);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║               ✅ DATA COPY COMPLETE!                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║ All your data is now safely copied to Neon!              ║');
    console.log('║                                                           ║');
    console.log('║ Next steps:                                               ║');
    console.log('║ 1. I will verify the data                                ║');
    console.log('║ 2. Then update your app to use Neon                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error during data copy:', error.message);
    console.error('\nDon\'t worry! Your original data on Supabase is safe.');
    console.error('Just tell me what error you see and I\'ll fix it.\n');
    process.exit(1);
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

copyData();
