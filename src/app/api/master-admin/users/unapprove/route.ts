import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { WEBSITE_CREATOR_EMAIL } from "@/lib/website-creator";

export async function POST(req: Request) {
  try {
    console.warn("🔵 [UNAPPROVE USER] POST request received");
    
    // Ensure only MASTER_ADMIN or WEBSITE_CREATOR can access
    const session = await auth();
    if (!session?.user?.email) {
      console.error("🔴 [UNAPPROVE USER] No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, email: true },
    });

    if (!admin || (admin.role !== "MASTER_ADMIN" && admin.role !== "WEBSITE_CREATOR")) {
      console.error("🔴 [UNAPPROVE USER] Forbidden:", admin?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.warn("🟢 [UNAPPROVE USER] Permission granted:", {
      email: admin.email,
      role: admin.role
    });

    const body = await req.json();
    const { userId, email } = body;
    console.warn("🔍 [UNAPPROVE USER] Request body:", { userId, email });

    if (!userId || !email) {
      console.error("🔴 [UNAPPROVE USER] Missing userId or email");
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    // Protect the website creator - cannot be unapproved
    if (email === WEBSITE_CREATOR_EMAIL) {
      console.error("🔴 [UNAPPROVE USER] Attempt to unapprove Website Creator blocked");
      return NextResponse.json(
        { error: "Website Creator account cannot be unapproved or modified" },
        { status: 403 }
      );
    }

    console.warn("🔵 [UNAPPROVE USER] Updating user status to PENDING:", { email });
    
    // Update user status back to PENDING
    await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: "PENDING" },
    });

    console.warn(`🟢 [UNAPPROVE USER] User unapproved successfully:`, { email, status: "PENDING" });

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
