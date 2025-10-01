import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";

export async function GET() {
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

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { value: "asc" },
      ],
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
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

    const { type, value } = await request.json();

    if (!type || !value) {
      return NextResponse.json({ error: "Type and value are required" }, { status: 400 });
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: {
        type_value: {
          type: type as TagType,
          value: value.trim(),
        },
      },
    });

    if (existingTag) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: {
        type: type as TagType,
        value: value.trim(),
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}
