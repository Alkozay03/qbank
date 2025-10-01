import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const extractions = await prisma.aIExtraction.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            customId: true,
          },
        },
        images: {
          select: {
            id: true,
            type: true,
            ocrText: true,
            confidence: true,
          },
        },
      },
    });

    const total = await prisma.aIExtraction.count();

    return NextResponse.json({
      extractions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching extractions:", error);
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

    const body = await request.json();
    const {
      imagePath,
      rawText,
      confidence,
      template,
      processingTime,
      images,
    } = body;

    const extraction = await prisma.aIExtraction.create({
      data: {
        imagePath,
        rawText,
        confidence,
        template,
        processingTime,
        images: images ? {
          create: images.map((img: any) => ({
            type: img.type,
            imageData: img.imageData ? Buffer.from(img.imageData, 'base64') : null,
            imageUrl: img.imageUrl,
            ocrText: img.ocrText,
            confidence: img.confidence,
          })),
        } : undefined,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(extraction, { status: 201 });
  } catch (error) {
    console.error("Error creating extraction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
