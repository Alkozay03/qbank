// src/app/api/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB limit to match client expectations

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/heif": ".heif",
  "image/heic": ".heic",
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

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
    if (!f) return NextResponse.json({ error: "file required" }, { status: 400 });

    if (typeof f.size === "number" && f.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large (5 MB max)." }, { status: 400 });
    }

    const declaredMime = typeof f.type === "string" ? f.type.toLowerCase() : "";
    const inferredFromName = (() => {
      const name = typeof (f as File & { name?: string }).name === "string" ? (f as File & { name?: string }).name : "";
      const ext = path.extname(name).toLowerCase();
      return ext && Object.values(ALLOWED_MIME_TO_EXT).includes(ext) ? ext : "";
    })();

    const extension = ALLOWED_MIME_TO_EXT[declaredMime] ?? inferredFromName;
    if (!extension) {
      return NextResponse.json({ error: "Unsupported image format." }, { status: 415 });
    }

    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const baseDir = path.join(process.cwd(), "public", "uploads", y, m, kind);
    ensureDir(baseDir);
    const name = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${extension}`;
    const filePath = path.join(baseDir, name);
    const buf = Buffer.from(await f.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    const url =
      "/" + path.relative(path.join(process.cwd(), "public"), filePath).replace(/\\/g, "/");
    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
