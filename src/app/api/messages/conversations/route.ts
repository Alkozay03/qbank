import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function GET() {
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

    let conversations;

    if (user.role === "MASTER_ADMIN") {
      // For master admin, get all active conversations with user info
      conversations = await prisma.conversation.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });
    } else {
      // For regular users, get only their conversations
      conversations = await prisma.conversation.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
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

    // Only regular users can start new conversations
    if (user.role === "MASTER_ADMIN") {
      return NextResponse.json({ error: "Master admin cannot start conversations" }, { status: 403 });
    }

    // Check if user already has an active conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    if (existingConversation) {
      return NextResponse.json({ conversation: existingConversation });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}