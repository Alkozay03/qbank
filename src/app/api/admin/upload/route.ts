// src/app/api/admin/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import fs from "node:fs";
import path from "node:path";

function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

export async function POST(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);
  
  // Check if we're in a serverless environment (Vercel)
  const isServerless = process.env.VERCEL === '1' || !fs.existsSync(path.join(process.cwd(), "public"));
  
  if (isServerless) {
    return NextResponse.json({ 
      error: "File uploads are not supported in serverless environments. Please set up Vercel Blob Storage or Supabase Storage. For now, you can use external image URLs instead of uploading files directly."
    }, { status: 501 });
  }
  
  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    const kind = (form.get("kind") as string | null) ?? "misc";
    if (!f) return NextResponse.json({ error: "file required" }, { status: 400 });

    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const baseDir = path.join(process.cwd(), "public", "uploads", y, m, kind);
    ensureDir(baseDir);
    const ext = (f.type && f.type.includes("png")) ? ".png" : (f.type && f.type.includes("jpeg")) ? ".jpg" : ".bin";
    const name = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
    const filePath = path.join(baseDir, name);
    const buf = Buffer.from(await f.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    const url = "/" + path.relative(path.join(process.cwd(), "public"), filePath).replace(/\\/g, "/");
    return NextResponse.json({ ok: true, url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

