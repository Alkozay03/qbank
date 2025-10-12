// Simple test API endpoint
import { prisma } from "@/server/db";

export async function GET() {
  
  try {
    const questionCount = await prisma.question.count();
    const tagCount = await prisma.tag.count();
    
    return new Response(JSON.stringify({
      questions: questionCount,
      tags: tagCount,
      message: "Database stats"
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: String(error)
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}
