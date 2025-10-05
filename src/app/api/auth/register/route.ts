// API route for approval-first registration
// Creates user with PENDING status WITHOUT sending magic link
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

// Allow only university emails
function isAllowedEmail(email?: string | null) {
  if (!email) return false;
  return /^u\d{8}@sharjah\.ac\.ae$/i.test(email.trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, firstName, lastName } = body;

    // Validate email format
    if (!email || !isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid university email format" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { 
        id: true, 
        approvalStatus: true,
        createdAt: true,
      },
    });

    if (existing) {
      // User already exists
      if (existing.approvalStatus === "PENDING") {
        // Update firstName and lastName if provided
        if (firstName?.trim() || lastName?.trim()) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              firstName: firstName?.trim() || null,
              lastName: lastName?.trim() || null,
            },
          });
          console.warn(`✅ Updated PENDING user info: ${email.toLowerCase().trim()}`);
        }
        
        return NextResponse.json({
          success: true,
          status: "PENDING",
          message: "Your account is awaiting admin approval",
        });
      }
      
      if (existing.approvalStatus === "BLOCKED") {
        return NextResponse.json(
          { success: false, error: "Your account has been blocked" },
          { status: 403 }
        );
      }

      // User is APPROVED - they should use the magic link to login
      return NextResponse.json({
        success: true,
        status: "APPROVED",
        message: "Your account is approved. Please check your email for the login link.",
      });
    }

    // Create new user with PENDING status (NO magic link sent)
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        approvalStatus: "PENDING",
        role: "MEMBER",
      },
      select: {
        id: true,
        email: true,
        approvalStatus: true,
        createdAt: true,
      },
    });

    console.warn(`✅ New user registered (PENDING approval): ${newUser.email}`);

    return NextResponse.json({
      success: true,
      status: "PENDING",
      message: "Your account has been created and is awaiting admin approval",
    });

  } catch (error) {
    console.error("Error in register API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register" },
      { status: 500 }
    );
  }
}
