// src/app/api/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB limit

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/heif",
  "image/heic",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    const rawKind = (form.get("kind") as string | null) ?? "comments";
    const kind = rawKind.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "comments";
    
    if (!f) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (typeof f.size === "number" && f.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large (5 MB max)." }, { status: 400 });
    }

    const declaredMime = typeof f.type === "string" ? f.type.toLowerCase() : "";
    if (!ALLOWED_MIME_TYPES.includes(declaredMime)) {
      return NextResponse.json({ error: "Unsupported image format." }, { status: 415 });
    }

    // Convert file to buffer
    const buf = Buffer.from(await f.arrayBuffer());
    
    // Upload to Cloudinary
    const url = await uploadToCloudinary(buf, kind);
    
    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to upload image";
    console.error("[Upload Error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
