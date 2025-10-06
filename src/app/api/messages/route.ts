import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, isActive: true },
    });

    if (!conversation || !conversation.isActive) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check access: regular users can only access their own conversations, master admin can access all
    if (user.role !== "MASTER_ADMIN" && conversation.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read based on user role
    if (user.role === "MASTER_ADMIN") {
      // Mark admin's unread messages as read
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { adminUnreadCount: 0 },
      });
    } else {
      // Mark user's unread messages as read
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { userUnreadCount: 0 },
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const { conversationId, content, imageUrl } = await req.json();

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: "Conversation ID and content required" }, { status: 400 });
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, isActive: true },
    });

    if (!conversation || !conversation.isActive) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check access
    if (user.role !== "MASTER_ADMIN" && conversation.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: content.trim(),
        imageUrl: imageUrl || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Update conversation's last message time and unread counts
    if (user.role === "MASTER_ADMIN") {
      // Admin sent message, increment user's unread count
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          userUnreadCount: { increment: 1 },
        },
      });
    } else {
      // User sent message, increment admin's unread count
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          adminUnreadCount: { increment: 1 },
        },
      });

      // Create notification for MASTER_ADMIN users about new message
      try {
        // Get user info for notification
        const userInfo = await prisma.user.findUnique({
          where: { id: user.id },
          select: { firstName: true, lastName: true, email: true },
        });

        // Get the last shortId to increment
        const lastNotification = await prisma.notification.findFirst({
          orderBy: { shortId: "desc" },
          select: { shortId: true },
        });
        const nextShortId = (lastNotification?.shortId || 0) + 1;

        const userName = userInfo?.firstName 
          ? `${userInfo.firstName} ${userInfo.lastName || ""}`.trim()
          : userInfo?.email || "a user";

        // Create notification visible to all admins
        await prisma.notification.create({
          data: {
            shortId: nextShortId,
            title: "New Message",
            body: `You have a new message from ${userName}`,
            createdById: user.id,
          },
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
        // Don't fail the message send if notification fails
      }
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}