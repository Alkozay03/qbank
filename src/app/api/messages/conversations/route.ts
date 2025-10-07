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
      // For master admin, get all HELP_CREATOR conversations
      conversations = await prisma.conversation.findMany({
        where: {
          isActive: true,
          messageType: "HELP_CREATOR",
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
        orderBy: { lastMessageAt: "desc" },
      });
    } else if (user.role === "ADMIN") {
      // For regular admin, get only conversations assigned to them
      conversations = await prisma.conversation.findMany({
        where: {
          isActive: true,
          recipientId: user.id,
          messageType: "CONTACT_ADMIN",
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

export async function POST(req: Request) {
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
    if (user.role === "MASTER_ADMIN" || user.role === "ADMIN") {
      return NextResponse.json({ error: "Admins cannot start conversations" }, { status: 403 });
    }

    const body = await req.json();
    const messageType = body.messageType || "HELP_CREATOR";

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

    // Determine recipient based on message type
    let recipientId: string | null = null;
    
    if (messageType === "CONTACT_ADMIN") {
      // Find all active admins (not master admin, just regular admins)
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          approvalStatus: "APPROVED",
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        // Randomly select an admin
        const randomAdmin = admins[Math.floor(Math.random() * admins.length)];
        recipientId = randomAdmin.id;
      } else {
        // If no regular admins, fall back to master admin
        const masterAdmin = await prisma.user.findFirst({
          where: { role: "MASTER_ADMIN" },
          select: { id: true },
        });
        recipientId = masterAdmin?.id || null;
      }
    } else {
      // HELP_CREATOR - assign to master admin
      const masterAdmin = await prisma.user.findFirst({
        where: { role: "MASTER_ADMIN" },
        select: { id: true },
      });
      recipientId = masterAdmin?.id || null;
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        recipientId,
        messageType,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}