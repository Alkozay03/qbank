// src/app/api/admin/help/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";
import { cache } from "@/lib/cache";

// Cache key for all help items (global, never changes unless admin updates)
const HELP_ITEMS_CACHE_KEY = "help-items-published";

// GET - Fetch all help items (public endpoint)
export async function GET() {
  try {
    // Check cache first (infinite TTL)
    let helpItems = cache.get<Array<{
      id: string;
      title: string;
      description: string;
      orderIndex: number;
      createdAt: Date;
    }>>(HELP_ITEMS_CACHE_KEY);

    if (!helpItems) {
      // Cache miss - query database
      helpItems = await prisma.helpItem.findMany({
        where: { isPublished: true },
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          orderIndex: true,
          createdAt: true,
        },
      });

      // Cache forever (only invalidated on admin updates)
      cache.set(HELP_ITEMS_CACHE_KEY, helpItems);
    }

    return NextResponse.json(helpItems);
  } catch (error) {
    console.error("Error fetching help items:", error);
    return NextResponse.json(
      { error: "Failed to fetch help items" },
      { status: 500 }
    );
  }
}

// POST - Create a new help item (admin only)
export async function POST(req: Request) {
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN" && user.role !== "WEBSITE_CREATOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, orderIndex } = await req.json() as {
      title: string;
      description: string;
      orderIndex?: number;
    };

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // If no orderIndex provided, set it to the next available position
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const lastItem = await prisma.helpItem.findFirst({
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      finalOrderIndex = (lastItem?.orderIndex ?? 0) + 1;
    }

    const helpItem = await prisma.helpItem.create({
      data: {
        title,
        description,
        orderIndex: finalOrderIndex,
      },
      select: {
        id: true,
        title: true,
        description: true,
        orderIndex: true,
        isPublished: true,
        createdAt: true,
      },
    });

    // Invalidate cache - students will get fresh data on next request
    cache.delete(HELP_ITEMS_CACHE_KEY);

    return NextResponse.json(helpItem);
  } catch (error) {
    console.error("Error creating help item:", error);
    return NextResponse.json(
      { error: "Failed to create help item" },
      { status: 500 }
    );
  }
}