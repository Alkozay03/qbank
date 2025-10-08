// API endpoint for individual rotation period management
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

type RouteContext =
  | { params: { periodId: string } }
  | { params: Promise<{ periodId: string }> };

// PATCH /api/admin/rotation-periods/[periodId]
// Update a rotation period or end it (mark votes as final)
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { periodId } = await Promise.resolve(context.params);
    const body = await request.json();
    const { action, ...updateData } = body;

    // Check if period exists
    const period = await prisma.rotationPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json({ error: "Rotation period not found" }, { status: 404 });
    }

    // Handle "end period" action
    if (action === "end") {
      // Mark period as inactive
      const updated = await prisma.rotationPeriod.update({
        where: { id: periodId },
        data: { isActive: false },
      });

      // Mark all votes from this period as final
      await prisma.answerVote.updateMany({
        where: {
          academicYear: period.academicYear,
          rotationNumber: period.rotationNumber,
          rotationName: period.rotationName,
          isFinal: false,
        },
        data: { isFinal: true },
      });

      return NextResponse.json({ period: updated, votesFinalised: true });
    }

    // Regular update (dates, etc.)
    const dataToUpdate: Record<string, unknown> = {};
    
    if (updateData.startDate) {
      dataToUpdate.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      dataToUpdate.endDate = new Date(updateData.endDate);
    }
    if (typeof updateData.isActive === "boolean") {
      dataToUpdate.isActive = updateData.isActive;
    }

    const updated = await prisma.rotationPeriod.update({
      where: { id: periodId },
      data: dataToUpdate,
    });

    return NextResponse.json({ period: updated });
  } catch (error) {
    console.error("[rotation-periods/PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update rotation period" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rotation-periods/[periodId]
// Delete a rotation period and all associated votes
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is admin or master admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { periodId } = await Promise.resolve(context.params);

    // Check if period exists
    const period = await prisma.rotationPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json({ error: "Rotation period not found" }, { status: 404 });
    }

    // Delete all votes associated with this period
    await prisma.answerVote.deleteMany({
      where: {
        academicYear: period.academicYear,
        rotationNumber: period.rotationNumber,
        rotationName: period.rotationName,
      },
    });

    // Delete the period
    await prisma.rotationPeriod.delete({
      where: { id: periodId },
    });

    return NextResponse.json({ success: true, message: "Rotation period and associated votes deleted" });
  } catch (error) {
    console.error("[rotation-periods/DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete rotation period" },
      { status: 500 }
    );
  }
}
