// API route to check database users (for debugging)
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        approvalStatus: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get counts
    const pending = await prisma.user.count({ where: { approvalStatus: 'PENDING' } });
    const approved = await prisma.user.count({ where: { approvalStatus: 'APPROVED' } });
    const blocked = await prisma.user.count({ where: { approvalStatus: 'BLOCKED' } });

    // Get recent verification tokens
    const tokens = await prisma.verificationToken.findMany({
      take: 10,
      orderBy: {
        expires: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: allUsers.length,
        pending,
        approved,
        blocked,
      },
      users: allUsers.map(u => ({
        email: u.email,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || '(no name)',
        status: u.approvalStatus,
        role: u.role,
        created: u.createdAt.toISOString(),
      })),
      recentTokens: tokens.map(t => ({
        email: t.identifier,
        expires: t.expires.toISOString(),
        isExpired: t.expires < new Date(),
      })),
    });
  } catch (error) {
    console.error('Error checking users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check users' },
      { status: 500 }
    );
  }
}
