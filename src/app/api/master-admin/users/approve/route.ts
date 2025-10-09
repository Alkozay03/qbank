import { NextResponse } from "next/server";
import { auth, signIn } from "@/auth";
import { prisma } from "@/server/db";

export async function POST(req: Request) {
  try {
    console.warn("🔵 [APPROVE USER] POST request received");
    
    // Ensure only MASTER_ADMIN or WEBSITE_CREATOR can access
    const session = await auth();
    if (!session?.user?.email) {
      console.error("🔴 [APPROVE USER] No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, email: true },
    });

    if (!admin || (admin.role !== "MASTER_ADMIN" && admin.role !== "WEBSITE_CREATOR")) {
      console.error("🔴 [APPROVE USER] Forbidden:", admin?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.warn("🟢 [APPROVE USER] Permission granted:", {
      email: admin.email,
      role: admin.role
    });

    const body = await req.json();
    const { userId, email } = body;
    console.warn("🔍 [APPROVE USER] Request body:", { userId, email });

    if (!userId || !email) {
      console.error("🔴 [APPROVE USER] Missing userId or email");
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    console.warn("🔵 [APPROVE USER] Approving user:", { userId, email });
    
    // Update user status to APPROVED
    await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: "APPROVED" },
    });

    console.warn("🟢 [APPROVE USER] User approved successfully:", email);

    // Trigger NextAuth's built-in magic link email
    // Note: The 24-hour reuse window fix prevents invalid token issues
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
