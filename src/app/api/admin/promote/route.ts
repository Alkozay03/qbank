// src/app/api/admin/promote/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function GET(_req: Request) {
  void _req; // Mark as intentionally unused
  try {
    // Get the current user (need to be at least an admin)
    const { email } = await requireRole(["ADMIN", "MASTER_ADMIN"]);
    
    // Check if it's the right user
    if (email !== "u21103000@sharjah.ac.ae" && email !== "U21103000@sharjah.ac.ae") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the user's role to MASTER_ADMIN
    await prisma.user.update({
      where: { email },
      data: { role: "MASTER_ADMIN" as Role },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Successfully promoted to MASTER_ADMIN" 
    });
  } catch (error) {
    console.error("Error in promotion endpoint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
