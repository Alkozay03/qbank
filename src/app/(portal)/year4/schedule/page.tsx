// src/app/(portal)/year4/schedule/page.tsx
export const dynamic = "force-dynamic";

import { prisma } from "@/server/db";
import { startOfWeekMonday, addDaysUTC, format12h } from "@/lib/dates";

type UiBlock = {
  id: string;
  dayOfWeek: number;
  type: "HOSPITAL_SHIFT" | "LECTURE";
  startsAt: Date;
  endsAt: Date;
  topic: string | null;
  tutor: string | null;
  location: string | null;
  link: string | null;
};

function dayName(i: number) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]!;
}

export default async function Year4SchedulePage() {
  const weekStart = startOfWeekMonday(new Date());

  let title = "Schedule";
  let items: UiBlock[] = [];

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { weekStart },
      include: { items: true },
    });

    if (schedule) {
      title = schedule.title ?? "Week Schedule";
      items = schedule.items.map((b) => ({
        id: b.id,
        dayOfWeek: b.dayOfWeek,
        // enum in DB is ScheduleItemType with these literal values
        type: b.type as UiBlock["type"],
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        topic: b.topic ?? null,
        tutor: b.tutor ?? null,
        location: b.location ?? null,
        link: b.link ?? null,
      }));
    }
  } catch (err) {
    // Gracefully ignore missing table/other prisma errors during early setup
    // eslint-disable-next-line no-console
    console.warn("[year4/schedule] Unable to load schedule:", err);
  }

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 -> 20:00
  const days = [0, 1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* header row */}
          <div className="grid" style={{ gridTemplateColumns: "140px repeat(7, 1fr)" }}>
            <div />
            {days.map((d) => {
              const date = addDaysUTC(weekStart, d);
              const label = date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              return (
                <div key={d} className="px-2 py-2 text-center font-medium border-b">
                  {dayName(d)} <span className="text-muted-foreground">{label}</span>
                </div>
              );
            })}

            {/* body - hour rows */}
            {hours.map((h) => (
              <div key={`row-${h}`} className="contents">
                <div className="border-r px-3 py-4 text-sm text-right">{format12h(h)}</div>
                {days.map((d) => (
                  <div key={`${h}-${d}`} className="relative border">
                    {items
                      .filter((b) => b.dayOfWeek === d)
                      .filter((b) => {
                        const sh = new Date(b.startsAt).getUTCHours();
                        const eh = new Date(b.endsAt).getUTCHours();
                        return h >= sh && h < eh;
                      })
                      .map((b) => {
                        const sh = new Date(b.startsAt).getUTCHours();
                        const eh = new Date(b.endsAt).getUTCHours();
                        const span = eh - Math.max(h, sh);
                        return (
                          <div
                            key={b.id}
                            className={`absolute inset-x-1 top-1 rounded px-2 py-1 text-xs text-white shadow ${
                              b.type === "HOSPITAL_SHIFT" ? "bg-blue-600" : "bg-pink-600"
                            }`}
                            style={{ height: `calc(${span} * 64px - 8px)` }} // row ~64px tall
                          >
                            {b.type === "HOSPITAL_SHIFT" ? (
                              <div className="font-semibold">Hospital Shift</div>
                            ) : (
                              <>
                                <div className="font-semibold">Lecture</div>
                                {b.topic && <div>Topic: {b.topic}</div>}
                                {b.tutor && <div>Tutor: {b.tutor}</div>}
                                <div>
                                  Time: {format12h(new Date(b.startsAt).getUTCHours())} –{" "}
                                  {format12h(new Date(b.endsAt).getUTCHours())}
                                </div>
                                {(b.location || b.link) && (
                                  <div>
                                    Location/Link:{" "}
                                    {b.link ? (
                                      <a className="underline" href={b.link} target="_blank">
                                        {b.location ?? b.link}
                                      </a>
                                    ) : (
                                      b.location
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
