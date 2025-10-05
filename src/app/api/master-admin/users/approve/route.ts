import { NextResponse } from "next/server";
import { auth, signIn } from "@/auth";
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

    // Trigger NextAuth's built-in magic link email
    try {
      await signIn("email", { email, redirect: false, callbackUrl: "/years" });
      console.warn(`✅ User approved and magic link sent via NextAuth: ${email}`);
      
      return NextResponse.json({ 
        success: true,
        message: `User approved! Magic link sent to ${email}`
      });
    } catch (emailError) {
      console.error("Error triggering magic link:", emailError);
      console.warn(`✅ User approved (email trigger failed): ${email}`);
      
      return NextResponse.json({ 
        success: true,
        message: `User approved! Ask them to visit login page for magic link.`
      });
    }
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
