import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import pdf from 'pdf-parse';

interface ExtractedQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation: string;
  educationalObjective: string;
  tags: string[];
}

function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  
  // Split by "Question X:" pattern
  const questionBlocks = text.split(/Question\s+\d+:/i).filter(block => block.trim());
  
  for (const block of questionBlocks) {
    try {
      const question = parseIndividualQuestion(block.trim());
      if (question) {
        questions.push(question);
      }
    } catch (error) {
      console.error('Error parsing individual question:', error);
      continue;
    }
  }
  
  return questions;
}

function parseIndividualQuestion(text: string): ExtractedQuestion | null {
  try {
    // Normalize line breaks and preserve paragraph structure
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Fix broken words at line endings (but preserve intentional breaks)
      .replace(/(\w)-\n(\w)/g, '$1$2') // Rejoin hyphenated words
      // More intelligent text flow - join lines that are part of the same sentence
      .replace(/([a-z,;])\n([a-z])/g, '$1 $2') // Join lines ending with lowercase/punctuation to lines starting with lowercase
      .replace(/(\w)\n([a-z])/g, '$1 $2') // Join word to lowercase continuation
      // Keep intentional paragraph breaks
      .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2') // Sentence ending to capital letter = new paragraph
      .replace(/\n\n+/g, '\n\n') // Normalize multiple line breaks
      // Keep bullet points and lists
      .replace(/\n•/g, '\n\n•')
      .replace(/\n-/g, '\n\n-');
    
    // Extract question text (everything before the first option)
    const optionAIndex = normalizedText.indexOf('A.');
    if (optionAIndex === -1) return null;
    
    const questionTextMatch = normalizedText.substring(0, optionAIndex).trim();
    if (!questionTextMatch) return null;
    
    // Preserve line breaks in question text
    const questionText = questionTextMatch.replace(/\n{2,}/g, '\n\n').trim();
    
    // Extract options with preserved formatting using indexOf method
    const optionBIndex = normalizedText.indexOf('B.');
    const optionCIndex = normalizedText.indexOf('C.');
    const optionDIndex = normalizedText.indexOf('D.');
    const optionEIndex = normalizedText.indexOf('E.');
    const correctAnswerIndex = normalizedText.indexOf('Correct Answer:');
    
    const optionAText = normalizedText.substring(optionAIndex + 2, optionBIndex).trim().replace(/\n+/g, ' ');
    const optionBText = normalizedText.substring(optionBIndex + 2, optionCIndex).trim().replace(/\n+/g, ' ');
    const optionCText = normalizedText.substring(optionCIndex + 2, optionDIndex).trim().replace(/\n+/g, ' ');
    
    let optionDText: string;
    let optionEText: string | undefined;
    
    if (optionEIndex > 0 && optionEIndex < correctAnswerIndex) {
      // Has option E
      optionDText = normalizedText.substring(optionDIndex + 2, optionEIndex).trim().replace(/\n+/g, ' ');
      optionEText = normalizedText.substring(optionEIndex + 2, correctAnswerIndex).trim().replace(/\n+/g, ' ');
    } else {
      // No option E
      optionDText = normalizedText.substring(optionDIndex + 2, correctAnswerIndex).trim().replace(/\n+/g, ' ');
    }
    
    if (!optionAText || !optionBText || !optionCText || !optionDText) {
      return null;
    }
    
    // Extract correct answer
    const correctAnswerMatch = normalizedText.match(/Correct Answer:\s*([A-E])\./);
    const correctAnswer = correctAnswerMatch?.[1];
    
    if (!correctAnswer) return null;
    
    // Extract explanation with preserved formatting (minimal bold detection)
    const explanationIndex = normalizedText.indexOf('Explanation:');
    const educationalObjectiveIndex = normalizedText.indexOf('Educational Objective:');
    const tagsIndex = normalizedText.indexOf('Tags:');
    
    let explanation = '';
    if (explanationIndex > 0) {
      const endIndex = educationalObjectiveIndex > 0 ? educationalObjectiveIndex : (tagsIndex > 0 ? tagsIndex : normalizedText.length);
      explanation = normalizedText.substring(explanationIndex + 12, endIndex).trim().replace(/\n{3,}/g, '\n\n');
      
      // Only detect very obvious bold patterns in explanation (conservative approach)
      explanation = explanation
        .replace(/(\*\*.*?\*\*)/g, '$1') // Keep existing markdown bold
        .replace(/(\b(?:Key Point|Important Note|Clinical Pearl|Remember):\s*)/gi, '**$1**'); // Only very specific medical headers
    }
    
    // Extract educational objective with preserved formatting (minimal bold detection)
    let educationalObjective = '';
    if (educationalObjectiveIndex > 0) {
      const endIndex = tagsIndex > 0 ? tagsIndex : normalizedText.length;
      educationalObjective = normalizedText.substring(educationalObjectiveIndex + 22, endIndex).trim().replace(/\n{3,}/g, '\n\n');
      
      // Only detect very obvious bold patterns in educational objective (conservative approach)
      educationalObjective = educationalObjective
        .replace(/(\*\*.*?\*\*)/g, '$1') // Keep existing markdown bold
        .replace(/(\b(?:Objective|Learning Goal|Key Concept):\s*)/gi, '**$1**'); // Only very specific educational headers
    }
    
    // Extract tags
    let tags: string[] = [];
    if (tagsIndex > 0) {
      const tagsText = normalizedText.substring(tagsIndex + 5).trim();
      tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }

    return {
      questionText,
      optionA: optionAText,
      optionB: optionBText,
      optionC: optionCText,
      optionD: optionDText,
      optionE: optionEText || undefined,
      correctAnswer,
      explanation,
      educationalObjective,
      tags,
    };
    
  } catch (error) {
    console.error('Error parsing question:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the uploaded PDF file
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    try {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Extract the text content from the PDF
      const pdfData = await pdf(buffer);
      const extractedText = pdfData.text;
      
      // Parse questions from the extracted text
      const questions = parseQuestionsFromText(extractedText);
      
      if (questions.length === 0) {
        return NextResponse.json({ 
          error: "No questions found in PDF. Please ensure the PDF contains properly formatted questions." 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        questions,
        message: `Successfully extracted ${questions.length} questions from PDF`
      });

    } catch (pdfError) {
      console.error('PDF processing error:', pdfError);
      return NextResponse.json({ 
        error: "Failed to process PDF file. Please ensure it's a valid PDF with text content." 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Bulk question extraction error:', error);
    return NextResponse.json({ 
      error: "Internal server error during question extraction" 
    }, { status: 500 });
  }
}
