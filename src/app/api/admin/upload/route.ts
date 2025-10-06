// src/app/api/admin/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);
  
  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    const kind = (form.get("kind") as string | null) ?? "misc";
    
    if (!f) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    // Convert file to buffer
    const buf = Buffer.from(await f.arrayBuffer());
    
    // Upload to Cloudinary
    const url = await uploadToCloudinary(buf, kind);
    
    return NextResponse.json({ ok: true, url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to upload image";
    console.error("[Admin Upload Error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

