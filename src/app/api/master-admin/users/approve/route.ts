import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

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

    // Update user status to APPROVED
    await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: "APPROVED" },
    });

    console.warn(`✅ User approved: ${email}`);
    
    // Note: We don't auto-send magic link anymore to avoid race conditions and token issues
    // The signIn() method is meant for client-side use, not server-side programmatic calls
    // User should request a new magic link from the login page when they're ready
    
    return NextResponse.json({ 
      success: true,
      message: `User approved! They can now login at the login page.`
    });
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
