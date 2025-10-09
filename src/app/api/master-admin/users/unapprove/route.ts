import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
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
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    // Protect the website creator - cannot be unapproved
    if (email === WEBSITE_CREATOR_EMAIL) {
      return NextResponse.json(
        { error: "Website Creator account cannot be unapproved or modified" },
        { status: 403 }
      );
    }

    // Update user status back to PENDING
    await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: "PENDING" },
    });

    console.warn(`⚠️ User unapproved (set to PENDING): ${email}`);

    return NextResponse.json({ 
      success: true,
      message: "User set back to PENDING status" 
    });
  } catch (error) {
    console.error("Error unapproving user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
