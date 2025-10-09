import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import type { ApprovalStatus } from "@prisma/client";
import { WEBSITE_CREATOR_EMAIL } from "@/lib/website-creator";

export async function POST(req: Request) {
  try {
    // Ensure only MASTER_ADMIN can access
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!admin || admin.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing userId or status" }, { status: 400 });
    }

    if (!["APPROVED", "BLOCKED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check if the user being modified is the website creator
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (targetUser?.email === WEBSITE_CREATOR_EMAIL) {
      return NextResponse.json(
        { error: "Website Creator account cannot be blocked or modified" },
        { status: 403 }
      );
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: status as ApprovalStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
