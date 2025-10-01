// src/app/api/master-admin/update-role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    // Ensure only MASTER_ADMIN can access this route
    const { email: _adminEmail } = await requireRole(["MASTER_ADMIN"]);
    void _adminEmail; // Mark as intentionally unused
    
    // Temporarily allow any MASTER_ADMIN user for debugging
    // TODO: Re-enable email restriction after fixing role assignment
    
    // For now, just check if user has MASTER_ADMIN role
    // if (_adminEmail === "u21103000@sharjah.ac.ae") {
    //   // Allow access - you are the authorized master admin
    // } else {
    //   // Deny access to anyone else
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }

    const body = await req.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    // Validate role
    if (!["MEMBER", "ADMIN", "MASTER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user's role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: role as Role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
