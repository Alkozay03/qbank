import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Only master admins can start conversations" }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
    }

    if (targetUser.role === "MASTER_ADMIN") {
      return NextResponse.json({ error: "Cannot start conversation with another admin" }, { status: 400 });
    }

    // Check if conversation already exists for this user
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userId: targetUser.id,
        isActive: true,
      },
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
    });

    if (existingConversation) {
      return NextResponse.json({ 
        conversation: existingConversation,
        message: "Conversation already exists with this user",
      });
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        userId: targetUser.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        messages: true,
      },
    });

    return NextResponse.json({ 
      conversation: {
        ...newConversation,
        messages: [],
      },
      message: "Conversation created successfully",
    });
  } catch (error) {
    console.error("Error starting conversation by email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
