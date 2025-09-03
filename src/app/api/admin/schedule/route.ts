// src/app/api/admin/schedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { startOfWeekMonday } from "@/lib/dates";

export async function GET() {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);

  const weekStart = startOfWeekMonday(new Date());

  // Schema uses Schedule + ScheduleItem (not ScheduleWeek/ScheduleBlock)
  const schedule = await db.schedule.findUnique({
    where: { weekStart },
    include: { items: true },
  });

  if (!schedule) return NextResponse.json({ title: "Schedule", blocks: [] });

  // Map DB items -> editor "blocks" shape the UI expects
  const blocks = schedule.items.map((b) => ({
    id: b.id,
    dayOfWeek: b.dayOfWeek,
    kind: b.type, // "HOSPITAL_SHIFT" | "LECTURE"
    startHour: new Date(b.startsAt).getUTCHours(),
    endHour: new Date(b.endsAt).getUTCHours(),
    topic: b.topic ?? undefined,
    tutor: b.tutor ?? undefined,
    location: b.location ?? undefined,
    link: b.link ?? undefined,
  }));

  return NextResponse.json({ title: schedule.title, blocks });
}

export async function POST(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);

  const body = await req.json();
  const { title, blocks } = body as {
    title: string;
    blocks: Array<{
      id?: string;
      dayOfWeek: number;
      kind: "HOSPITAL_SHIFT" | "LECTURE";
      startHour: number;
      endHour: number;
      topic?: string;
      tutor?: string;
      location?: string;
      link?: string;
    }>;
  };

  const weekStart = startOfWeekMonday(new Date());

  // Upsert Schedule for this weekStart
  const schedule = await db.schedule.upsert({
    where: { weekStart },
    create: { weekStart, title },
    update: { title },
  });

  // Replace items for this week
  await db.scheduleItem.deleteMany({ where: { scheduleId: schedule.id } });

  await db.scheduleItem.createMany({
    data: blocks.map((b) => ({
      scheduleId: schedule.id,
      dayOfWeek: b.dayOfWeek,
      type: b.kind, // matches enum ScheduleItemType
      startsAt: new Date(
        Date.UTC(
          weekStart.getUTCFullYear(),
          weekStart.getUTCMonth(),
          weekStart.getUTCDate() + b.dayOfWeek,
          b.startHour,
          0,
          0
        )
      ),
      endsAt: new Date(
        Date.UTC(
          weekStart.getUTCFullYear(),
          weekStart.getUTCMonth(),
          weekStart.getUTCDate() + b.dayOfWeek,
          b.endHour,
          0,
          0
        )
      ),
      topic: b.topic ?? null,
      tutor: b.tutor ?? null,
      location: b.location ?? null,
      link: b.link ?? null,
    })),
  });

  return NextResponse.json({ ok: true });
}
