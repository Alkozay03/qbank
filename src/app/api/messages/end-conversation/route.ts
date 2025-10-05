import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, isActive: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check access
    if (user.role !== "MASTER_ADMIN" && conversation.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // End conversation (delete all messages and mark as inactive)
    await prisma.$transaction([
      // Delete all messages
      prisma.message.deleteMany({
        where: { conversationId },
      }),
      // Mark conversation as inactive
      prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          isActive: false,
          userUnreadCount: 0,
          adminUnreadCount: 0,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}