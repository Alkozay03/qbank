// EMQ (Extended Matching Question) helper functions
import { prisma } from "@/server/db";

export type EMQOption = {
  id: string;
  text: string;
};

export type EMQStem = {
  id: string;
  text: string;
  correctOptionIds: string[];
  stemImageUrl?: string;
};

export type EMQQuestionData = {
  questionType: 'EMQ';
  emqTheme: string;
  emqOptions: EMQOption[];
  emqStems: EMQStem[];
  explanation?: string | null;
  objective?: string | null;
  references?: string | null;
};

export type MCQQuestionData = {
  questionType: 'MCQ';
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation?: string | null;
  objective?: string | null;
  references?: string | null;
};

/**
 * Converts MCQ options (A, B, C, D, E) into Choice records
 */
export async function createMCQChoices(questionId: string, data: MCQQuestionData) {
  const choices = [];
  const options = ['A', 'B', 'C', 'D', 'E'] as const;
  
  for (const option of options) {
    const key = `option${option}` as keyof MCQQuestionData;
    const text = data[key];
    if (text && typeof text === 'string' && text.trim()) {
      choices.push({
        questionId,
        text: `${option}. ${text}`,
        isCorrect: data.correctAnswer === option,
      });
    }
  }
  
  if (choices.length > 0) {
    await prisma.choice.createMany({ data: choices });
  }
}

/**
 * Converts EMQ data into Question record with emqOptions JSON
 * and stems as Choice records
 */
export async function createEMQChoices(questionId: string, data: EMQQuestionData) {
  // EMQ stems are stored as Choice records
  const stems = data.emqStems.map(stem => ({
    questionId,
    text: stem.text,
    isCorrect: false, // Not applicable for EMQ stems
    stemImageUrl: stem.stemImageUrl || null,
    correctOptionIds: stem.correctOptionIds, // Array of option IDs
  }));
  
  if (stems.length > 0) {
    await prisma.choice.createMany({ data: stems });
  }
}

/**
 * Retrieves EMQ question with options and stems
 */
export async function getEMQQuestion(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      Choice: true, // Stems are stored as Choice records
    },
  });
  
  if (!question || question.questionType !== 'EMQ') {
    return null;
  }
  
  return {
    ...question,
    emqOptions: (question.emqOptions as EMQOption[]) || [],
    emqStems: question.Choice.map(choice => ({
      id: choice.id,
      text: choice.text,
      correctOptionIds: (choice.correctOptionIds as string[]) || [],
      stemImageUrl: choice.stemImageUrl,
    })),
  };
}

/**
 * Updates EMQ question
 */
export async function updateEMQQuestion(
  questionId: string,
  data: Partial<EMQQuestionData>
) {
  // Update question record
  await prisma.question.update({
    where: { id: questionId },
    data: {
      emqTheme: data.emqTheme,
      emqOptions: data.emqOptions || [],
      explanation: data.explanation,
      objective: data.objective,
      references: data.references,
    },
  });
  
  // Delete existing stems
  await prisma.choice.deleteMany({
    where: { questionId },
  });
  
  // Create new stems
  if (data.emqStems && data.emqStems.length > 0) {
    await createEMQChoices(questionId, data as EMQQuestionData);
  }
}
