import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

interface LinkExtractionRequest {
  extractionId: string;
  questionId: string;
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

    const body: LinkExtractionRequest = await request.json();
    const { extractionId, questionId } = body;

    if (!extractionId || !questionId) {
      return NextResponse.json({ error: "extractionId and questionId are required" }, { status: 400 });
    }

    // Check if extraction exists
    const extraction = await prisma.aIExtraction.findUnique({
      where: { id: extractionId },
    });

    if (!extraction) {
      return NextResponse.json({ error: "Extraction not found" }, { status: 404 });
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Link extraction to question
    const updatedExtraction = await prisma.aIExtraction.update({
      where: { id: extractionId },
      data: { questionId },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            customId: true,
          },
        },
      },
    });

    return NextResponse.json(updatedExtraction);
  } catch (error) {
    console.error("Error linking extraction to question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const extractionId = searchParams.get("extractionId");

    if (!extractionId) {
      return NextResponse.json({ error: "extractionId is required" }, { status: 400 });
    }

    // Unlink extraction from question
    const updatedExtraction = await prisma.aIExtraction.update({
      where: { id: extractionId },
      data: { questionId: null },
    });

    return NextResponse.json(updatedExtraction);
  } catch (error) {
    console.error("Error unlinking extraction from question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
