// Check recent question creation activity
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkRecentQuestions() {
  console.error("🔍 Checking recent question creation activity...\n");

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

  console.error(`📊 Total questions created in last 7 days: ${recentQuestions.length}\n`);

  if (recentQuestions.length === 0) {
    console.error("⚠️  No questions created in the last 7 days!\n");
    return;
  }

  console.error("\n📝 Recent questions:\n");
  for (const q of recentQuestions) {
    const hasEmbedding = q.embedding ? "✅" : "❌";
    const rotationTag = q.questionTags.find((qt) =>
      ["peds", "surgery", "medicine", "obgyn", "psych", "fp"].includes(
        qt.tag.value.toLowerCase()
      )
    );
    const rotation = rotationTag ? rotationTag.tag.value : "NO ROTATION";
    const answerStatus = q.isAnswerConfirmed ? "Confirmed" : "Pending";

    console.error(
      `  Q${q.customId} | ${q.yearCaptured} | ${rotation} | ${answerStatus} | Embedding: ${hasEmbedding}`
    );
    console.error(`    Created: ${q.createdAt.toLocaleString()}`);
    console.error(
      `    Text: ${q.text ? q.text.substring(0, 60) + "..." : "NO TEXT"}`
    );
    console.error("");
  }

  // Check for potential issues
  console.error("\n⚠️  Potential Issues:\n");

  const questionsWithoutEmbedding = recentQuestions.filter((q) => !q.embedding);
  if (questionsWithoutEmbedding.length > 0) {
    console.error(
      `  ❌ ${questionsWithoutEmbedding.length} questions without embeddings:`
    );
    for (const q of questionsWithoutEmbedding) {
      console.error(`     - Q${q.customId} (${q.yearCaptured})`);
    }
    console.error("");
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
    console.error(
      `  ❌ ${questionsWithoutRotation.length} questions without rotation tags:`
    );
    for (const q of questionsWithoutRotation) {
      console.error(`     - Q${q.customId} (${q.yearCaptured})`);
    }
    console.error("");
  }

  const questionsWithoutText = recentQuestions.filter((q) => !q.text);
  if (questionsWithoutText.length > 0) {
    console.error(`  ❌ ${questionsWithoutText.length} questions without text!`);
  }

  if (
    questionsWithoutEmbedding.length === 0 &&
    questionsWithoutRotation.length === 0 &&
    questionsWithoutText.length === 0
  ) {
    console.error("  ✅ All questions look good!");
  }
}

checkRecentQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
