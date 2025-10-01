// src/app/api/notifications/item/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request) {
  const url = new URL(req.url);
  
  // Get by ID (CUID)
  const id = url.searchParams.get("id");
  if (id) {
    const notification = await prisma.notification.findUnique({
      where: { id, isDeleted: false },
    });
    
    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ notification });
  }
  
  // Get by shortId (numeric)
  const shortIdParam = url.searchParams.get("shortId");
  if (shortIdParam) {
    const shortId = Number(shortIdParam);
    if (isNaN(shortId)) {
      return NextResponse.json({ error: "Invalid shortId" }, { status: 400 });
    }
    
    const notification = await prisma.notification.findUnique({
      where: { shortId, isDeleted: false },
    });
    
    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ notification });
  }
  
  return NextResponse.json({ error: "Either id or shortId is required" }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    // Check admin permissions
    await requireRole(["ADMIN", "MASTER_ADMIN"]);
    
    const body = await req.json();
    const { title, body: content, shortId } = body;
    
    // Validate input
    if (!title || !content) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }
    
    // Use provided shortId or generate one
    const numericId = shortId || Math.floor(100000 + Math.random() * 900000);
    
    // Check if shortId already exists
    const existing = await prisma.notification.findUnique({
      where: { shortId: numericId },
    });
    
    if (existing) {
      return NextResponse.json({ error: "Notification with this shortId already exists" }, { status: 409 });
    }
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        shortId: numericId,
        title,
        body: content,
      },
    });
    
    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    
    // If table doesn't exist, provide helpful error message
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { error: "Notification system not available. Please contact administrator." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    // Check admin permissions
    await requireRole(["ADMIN", "MASTER_ADMIN"]);
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }
    
    const body = await req.json();
    const { title, body: content, shortId } = body;
    
    // Validate input
    if (!title && !content && !shortId) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    
    // Prepare update data
    const updateData: {
      title?: string;
      body?: string;
      shortId?: number;
    } = {};
    if (title) updateData.title = title;
    if (content) updateData.body = content;
    if (shortId) updateData.shortId = shortId;
    
    // Update notification
    const notification = await prisma.notification.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // Check admin permissions
    await requireRole(["ADMIN", "MASTER_ADMIN"]);
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }
    
    // Soft delete by setting isDeleted flag
    await prisma.notification.update({
      where: { id },
      data: { isDeleted: true },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete notification" },
      { status: 500 }
    );
  }
}
