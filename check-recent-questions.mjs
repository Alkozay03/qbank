// Check recent question creation activity
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkRecentQuestions() {
  console.log("🔍 Checking recent question creation activity...\n");

  // Get questions from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentQuestions = await prisma.question.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      id: true,
      customId: true,
      text: true,
      createdAt: true,
      yearCaptured: true,
      embedding: true,
      isAnswerConfirmed: true,
      questionTags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`📊 Total questions created in last 7 days: ${recentQuestions.length}\n`);

  if (recentQuestions.length === 0) {
    console.log("⚠️  No questions created in the last 7 days!\n");
    return;
  }

  // Group by user
  const byUser = {};
  for (const q of recentQuestions) {
    const userKey = q.createdBy?.email || "Unknown";
    if (!byUser[userKey]) {
      byUser[userKey] = {
        name: q.createdBy
          ? `${q.createdBy.firstName} ${q.createdBy.lastName}`
          : "Unknown",
        questions: [],
      };
    }
    byUser[userKey].questions.push(q);
  }

  console.log("👥 Questions by user:\n");
  for (const [email, data] of Object.entries(byUser)) {
    console.log(`  ${data.name} (${email}): ${data.questions.length} questions`);
  }

  console.log("\n📝 Recent questions detail:\n");
  for (const q of recentQuestions.slice(0, 20)) {
    // Show last 20
    const userName = q.createdBy
      ? `${q.createdBy.firstName} ${q.createdBy.lastName}`
      : "Unknown";
    const status = q.isDraft
      ? "DRAFT"
      : q.isConfirmed
      ? "CONFIRMED"
      : "PENDING";
    const hasEmbedding = q.embedding ? "✅" : "❌";
    const rotationTag = q.questionTags.find((qt) =>
      ["peds", "surgery", "medicine", "obgyn", "psych", "fp"].includes(
        qt.tag.value.toLowerCase()
      )
    );
    const rotation = rotationTag ? rotationTag.tag.value : "NO ROTATION";

    console.log(
      `  Q${q.customId} | ${q.yearCaptured} | ${rotation} | ${status} | Embedding: ${hasEmbedding}`
    );
    console.log(`    By: ${userName}`);
    console.log(`    Created: ${q.createdAt.toLocaleString()}`);
    console.log(
      `    Text: ${q.text ? q.text.substring(0, 60) + "..." : "NO TEXT"}`
    );
    console.log("");
  }

  // Check for potential issues
  console.log("\n⚠️  Potential Issues:\n");

  const questionsWithoutEmbedding = recentQuestions.filter((q) => !q.embedding);
  if (questionsWithoutEmbedding.length > 0) {
    console.log(
      `  ❌ ${questionsWithoutEmbedding.length} questions without embeddings:`
    );
    for (const q of questionsWithoutEmbedding) {
      console.log(`     - Q${q.customId} (${q.yearCaptured})`);
    }
    console.log("");
  }

  const questionsWithoutRotation = recentQuestions.filter((q) => {
    const rotationTag = q.questionTags.find((qt) =>
      ["peds", "surgery", "medicine", "obgyn", "psych", "fp"].includes(
        qt.tag.value.toLowerCase()
      )
    );
    return !rotationTag;
  });
  if (questionsWithoutRotation.length > 0) {
    console.log(
      `  ❌ ${questionsWithoutRotation.length} questions without rotation tags:`
    );
    for (const q of questionsWithoutRotation) {
      console.log(`     - Q${q.customId} (${q.yearCaptured})`);
    }
    console.log("");
  }

  const draftQuestions = recentQuestions.filter((q) => q.isDraft);
  if (draftQuestions.length > 0) {
    console.log(`  📝 ${draftQuestions.length} draft questions (not published yet)`);
  }

  const pendingQuestions = recentQuestions.filter(
    (q) => !q.isDraft && !q.isConfirmed
  );
  if (pendingQuestions.length > 0) {
    console.log(
      `  ⏳ ${pendingQuestions.length} pending questions (awaiting confirmation)`
    );
  }
}

checkRecentQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
