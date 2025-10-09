// src/app/api/admin/help/reorder/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    // Check authentication
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    // Check authorization - only MASTER_ADMIN can reorder
    if (dbUser?.role !== "MASTER_ADMIN") {
      return NextResponse.json(
        { error: "Not authorized. Master Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updates } = body as { updates: Array<{ id: string; orderIndex: number }> };

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid updates format" },
        { status: 400 }
      );
    }

    // Update all order indices in a transaction
    await prisma.$transaction(
      updates.map((update) =>
        prisma.helpItem.update({
          where: { id: update.id },
          data: { orderIndex: update.orderIndex },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering help items:", error);
    return NextResponse.json(
      { error: "Failed to reorder help items" },
      { status: 500 }
    );
  }
}
