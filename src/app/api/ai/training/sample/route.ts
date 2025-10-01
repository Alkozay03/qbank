// src/app/api/ai/training/sample/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    const bboxesStr = (form.get("bboxes") as string | null) ?? null;
    const resource = (form.get("resource") as string | null) ?? null;
    const x = Number(form.get("x") || 0);
    const y = Number(form.get("y") || 0);
    const w = Number(form.get("w") || 0);
    const h = Number(form.get("h") || 0);
    const iw = Number(form.get("iw") || 0);
    const ih = Number(form.get("ih") || 0);
    const cls = form.get("cls") != null ? Number(form.get("cls")) : 0;
    if (!f) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const root = path.join(process.cwd(), "training_data");
    const imgDir = path.join(root, "images");
    const lblDir = path.join(root, "labels");
    const metaDir = path.join(root, "meta");
    ensureDir(imgDir); ensureDir(lblDir); ensureDir(metaDir);

    const ext = ".png";
    const imgPath = path.join(imgDir, `${id}${ext}`);
    const buf = Buffer.from(await f.arrayBuffer());
    fs.writeFileSync(imgPath, buf);

    // YOLO normalized bbox lines
    const lblPath = path.join(lblDir, `${id}.txt`);
    const lines: string[] = [];
    if (bboxesStr) {
      // bboxes: [{x,y,w,h,cls,iw,ih}]
      let parsed: Array<{x:number;y:number;w:number;h:number;cls:number;iw:number;ih:number}> = [];
      try { parsed = JSON.parse(bboxesStr) as Array<{x:number;y:number;w:number;h:number;cls:number;iw:number;ih:number}>; } catch {}
      for (const b of parsed || []) {
        const cx = (b.x + b.w / 2) / (b.iw || iw || 1);
        const cy = (b.y + b.h / 2) / (b.ih || ih || 1);
        const nw = (b.w) / (b.iw || iw || 1);
        const nh = (b.h) / (b.ih || ih || 1);
        const c = Number.isFinite(b.cls) ? b.cls : 0;
        lines.push(`${c} ${cx.toFixed(6)} ${cy.toFixed(6)} ${nw.toFixed(6)} ${nh.toFixed(6)}`);
      }
    } else if (iw && ih && w && h) {
      const cx = (x + w / 2) / iw;
      const cy = (y + h / 2) / ih;
      const nw = w / iw;
      const nh = h / ih;
      lines.push(`${cls} ${cx.toFixed(6)} ${cy.toFixed(6)} ${nw.toFixed(6)} ${nh.toFixed(6)}`);
    } else {
      return NextResponse.json({ error: "bbox missing (provide bboxes JSON or x,y,w,h,iw,ih)" }, { status: 400 });
    }
    fs.writeFileSync(lblPath, lines.join("\n") + "\n");
    // Write metadata JSON (resource + boxes)
    const meta = {
      id,
      resource: resource || null,
      boxes: (bboxesStr ? JSON.parse(bboxesStr) : (iw && ih && w && h ? [{ x, y, w, h, cls, iw, ih }] : [])) as Array<unknown>,
      createdAt: new Date().toISOString(),
      image: path.relative(process.cwd(), imgPath),
      label: path.relative(process.cwd(), lblPath),
    };
    const metaPath = path.join(metaDir, `${id}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    return NextResponse.json({ ok: true, id, image: meta.image, label: meta.label, meta: path.relative(process.cwd(), metaPath), count: lines.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const root = path.join(process.cwd(), "training_data");
    if (fs.existsSync(root)) {
      // Remove entire training_data directory
      fs.rmSync(root, { recursive: true, force: true });
    }
    // Recreate empty structure for future samples
    const imgDir = path.join(root, "images");
    const lblDir = path.join(root, "labels");
    const metaDir = path.join(root, "meta");
    ensureDir(imgDir);
    ensureDir(lblDir);
    ensureDir(metaDir);

    return NextResponse.json({ ok: true, cleared: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
