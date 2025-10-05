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

    let unreadCount = 0;

    if (user.role === "MASTER_ADMIN") {
      // For master admin, count unread messages across all conversations
      const result = await prisma.conversation.aggregate({
        _sum: {
          adminUnreadCount: true,
        },
        where: {
          isActive: true,
        },
      });
      unreadCount = result._sum.adminUnreadCount || 0;
    } else {
      // For regular users, count unread messages in their conversations
      const result = await prisma.conversation.aggregate({
        _sum: {
          userUnreadCount: true,
        },
        where: {
          userId: user.id,
          isActive: true,
        },
      });
      unreadCount = result._sum.userUnreadCount || 0;
    }

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error("Error counting unread messages:", error);
    return NextResponse.json({ count: 0 });
  }
}