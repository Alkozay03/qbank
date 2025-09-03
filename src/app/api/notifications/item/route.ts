// src/app/api/notifications/item/route.ts
export const runtime = "nodejs";

import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Prefer ?shortId=, but accept legacy ?customId= as a fallback
  const idParam = url.searchParams.get("shortId") ?? url.searchParams.get("customId");
  const shortId = Number(idParam);

  if (!shortId) {
    return new Response("shortId required", { status: 400 });
  }

  const n = await prisma.notification.findUnique({ where: { shortId } });
  if (!n || n.isDeleted) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(n.body ?? "", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
