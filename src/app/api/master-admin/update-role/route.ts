// src/app/api/master-admin/update-role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { normalizeRole, requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    console.warn("🔵 [UPDATE ROLE] POST request received");
    
    // Ensure only MASTER_ADMIN or WEBSITE_CREATOR can access this route
    const userInfo = await requireRole(["MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.warn("🟢 [UPDATE ROLE] Permission granted:", {
      email: userInfo.email,
      role: userInfo.role
    });

    const body = await req.json();
    console.warn("🔍 [UPDATE ROLE] Request body:", body);
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    let normalizedRole: Role;
    try {
      normalizedRole = normalizeRole(role);
    } catch (err) {
      console.error("🔴 [UPDATE ROLE] Invalid role:", role, err);
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    console.warn("🔍 [UPDATE ROLE] Finding user:", email);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (!user) {
      console.error("🔴 [UPDATE ROLE] User not found:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.warn("🔵 [UPDATE ROLE] Updating user role:", {
      email,
      currentRole: user.role,
      newRole: normalizedRole
    });

    // Update the user's role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: normalizedRole },
    });

    console.warn("🟢 [UPDATE ROLE] Role updated successfully:", {
      email,
      newRole: normalizedRole
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("🔴 [UPDATE ROLE] Error updating role:", error);
    console.error("🔴 [UPDATE ROLE] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "An error occurred",
        details: "Failed to update user role"
      },
      { status: 500 }
    );
  }
}
