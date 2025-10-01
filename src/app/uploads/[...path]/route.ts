export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

const BASE_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".heif": "image/heif",
  ".heic": "image/heic",
};

function sanitizeSegment(segment: string): string {
  return segment.replace(/\\/g, "").replace(/\0/g, "").replace(/\.\./g, "");
}

function getMimeType(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

export async function GET(_req: NextRequest, { params }: { params: { path?: string[] } }) {
  const segments = params.path ?? [];
  if (segments.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const sanitizedSegments = segments
    .map((segment) => sanitizeSegment(segment))
    .filter((segment) => segment.length > 0 && segment !== "..");

  if (sanitizedSegments.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const filePath = path.join(BASE_DIR, ...sanitizedSegments);

  try {
  const fileBuffer = await fs.readFile(filePath);
  const body = new Uint8Array(fileBuffer);
    const ext = path.extname(filePath);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return new NextResponse(null, { status: 404 });
    }
    console.error("Failed to serve uploaded file", error);
    return NextResponse.json({ error: "Failed to load uploaded file" }, { status: 500 });
  }
}
