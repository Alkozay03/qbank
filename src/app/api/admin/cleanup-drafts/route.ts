import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

// Clean up draft questions older than 1 hour
export async function GET() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await prisma.question.deleteMany({
      where: {
        AND: [
          { text: '[Draft - Not yet saved]' },
          { createdAt: { lt: oneHourAgo } }
        ]
      }
    });

    console.warn(`🧹 [DRAFT CLEANUP] Deleted ${result.count} stale draft questions`);

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `Cleaned up ${result.count} stale draft questions`
    });

  } catch (error) {
    console.error('❌ [DRAFT CLEANUP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clean up drafts' },
      { status: 500 }
    );
  }
}
