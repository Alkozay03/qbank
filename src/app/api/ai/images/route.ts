import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const extractionId = searchParams.get("extractionId");

    if (!extractionId) {
      return NextResponse.json({ error: "extractionId is required" }, { status: 400 });
    }

    const images = await prisma.extractionImage.findMany({
      where: { extractionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error("Error fetching extraction images:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const extractionId = formData.get("extractionId") as string;
    const type = formData.get("type") as string;
    const file = formData.get("file") as File;
    const ocrText = formData.get("ocrText") as string;
    const confidence = formData.get("confidence") ? parseFloat(formData.get("confidence") as string) : null;

    if (!extractionId || !type || !file) {
      return NextResponse.json({ error: "extractionId, type, and file are required" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const image = await prisma.extractionImage.create({
      data: {
        extractionId,
        type,
        imageData: buffer,
        ocrText,
        confidence,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Error creating extraction image:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
