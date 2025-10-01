// Simple test API endpoint
export async function GET() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
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
