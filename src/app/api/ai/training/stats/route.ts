// src/app/api/ai/training/stats/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const root = path.join(process.cwd(), "training_data", "meta");
    const byResource: Record<string, number> = {};
    if (fs.existsSync(root)) {
      const files = await fsp.readdir(root);
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        try {
          const j = JSON.parse(await fsp.readFile(path.join(root, f), "utf8")) as { resource?: string | null };
          const key = (j.resource || "(unknown)").toString();
          byResource[key] = (byResource[key] || 0) + 1;
        } catch {
          // ignore
        }
      }
    }
    return NextResponse.json({ byResource });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

