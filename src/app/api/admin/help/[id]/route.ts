// src/app/api/admin/help/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

// PUT - Update a help item (admin only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { title, description, orderIndex, isPublished } = await req.json() as {
      title?: string;
      description?: string;
      orderIndex?: number;
      isPublished?: boolean;
    };

    const helpItem = await prisma.helpItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(orderIndex !== undefined && { orderIndex }),
        ...(isPublished !== undefined && { isPublished }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        orderIndex: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(helpItem);
  } catch (error) {
    console.error("Error updating help item:", error);
    return NextResponse.json(
      { error: "Failed to update help item" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a help item (admin only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.helpItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting help item:", error);
    return NextResponse.json(
      { error: "Failed to delete help item" },
      { status: 500 }
    );
  }
}