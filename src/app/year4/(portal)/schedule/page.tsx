// src/app/(portal)/year4/schedule/page.tsx
export const dynamic = "force-dynamic";

import { prisma } from "@/server/db";
import { auth } from "@/auth";
import { startOfWeekMonday, addDaysUTC, format12h } from "@/lib/dates";
import Shell from "@/components/Shell";
import { cache } from "@/lib/cache";

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
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]!;
}

function dayShort(i: number) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]!;
}

export default async function Year4SchedulePage() {
  const weekStart = startOfWeekMonday(new Date());
  
  let title = "Weekly Schedule";
  let items: UiBlock[] = [];

  try {
    // Get current user's rotation
    const session = await auth();
    let userRotation: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { rotation: true },
      });
      userRotation = user?.rotation || null;
    }

    // Cache key: rotation-specific + week-specific
    // Schedule is identical for all students in same rotation during same week
    // Cache forever until admin updates (manual invalidation)
    const cacheKey = `schedule-${userRotation || 'global'}-${weekStart.toISOString()}`;
    
    type CachedSchedule = { title: string | null; items: UiBlock[] };
    let schedule = cache.get<CachedSchedule>(cacheKey);
    
    if (!schedule) {
      // Cache miss - query database
      const dbSchedule = await prisma.schedule.findUnique({
        where: { weekStart },
        include: { items: true },
      });
      
      if (dbSchedule) {
        // Transform and cache forever (no TTL - only invalidated manually)
        const transformedItems = dbSchedule.items.map((b) => ({
          id: b.id,
          dayOfWeek: b.dayOfWeek,
          type: b.type as UiBlock["type"],
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          topic: b.topic ?? null,
          tutor: b.tutor ?? null,
          location: b.location ?? null,
          link: b.link ?? null,
        }));
        
        schedule = {
          title: dbSchedule.title,
          items: transformedItems
        };
        cache.set(cacheKey, schedule);
      }
    }

    if (schedule) {
      title = schedule.title ?? "Weekly Schedule";
      items = schedule.items;
    }
  } catch (err) {
    console.error("Failed to load schedule:", err);
  }

  // Day blocks with days of week
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysUTC(weekStart, i);
    const dayBlocks = items.filter((b) => b.dayOfWeek === i);
    return { i, name: dayName(i), short: dayShort(i), date, blocks: dayBlocks };
  });

  const currentDay = new Date().getDay();
  const currentDayIndex = currentDay === 0 ? 6 : currentDay - 1; // Convert Sunday=0 to Monday=0

  return (
    <Shell title={title} pageName="Schedule">
      {/* Week Overview Header */}
      <div className="mb-8 bg-primary-light rounded-2xl border-2 border-primary shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold theme-gradient-text">
              {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - {addDaysUTC(weekStart, 6).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </h2>
            <p className="text-primary font-medium mt-1">
              {items.length} scheduled {items.length === 1 ? "event" : "events"} this week
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full theme-gradient"></div>
              <span className="text-sm font-medium text-primary">Hospital Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary"></div>
              <span className="text-sm font-medium text-primary">Lecture</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl overflow-hidden shadow-lg">
        {/* Header Row */}
        <div className="grid grid-cols-7 theme-gradient rounded-t-xl">
          {days.map((d) => {
            const isToday = d.i === currentDayIndex;
            return (
              <div key={d.i} className="p-4 text-center">
                <div className="font-bold text-lg text-white">
                  <span className="hidden sm:inline">{d.name}</span>
                  <span className="sm:hidden">{d.short}</span>
                </div>
                <div className="text-sm font-medium mt-1 text-white/90">
                  {d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                {isToday && (
                  <div className="mt-2">
                    <div className="w-2 h-2 bg-white rounded-full mx-auto animate-pulse"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Day blocks with events */}
        <div className="grid grid-cols-7 min-h-[500px] bg-white rounded-b-xl">
          {days.map((d) => {
            return (
              <div 
                key={d.i} 
                className="p-4 relative border-r-2 last:border-r-0"
                style={{ borderColor: 'var(--color-primary)' }}
              >
                {d.blocks.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm font-medium">No events</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {d.blocks.map((b) => {
                      const isHospital = b.type === "HOSPITAL_SHIFT";
                      
                      return (
                        <div 
                          key={b.id}
                          className={`group relative p-4 rounded-xl shadow-md transition-all duration-200 ${
                            isHospital 
                              ? 'theme-gradient text-white' 
                              : 'bg-primary text-white'
                          }`}
                        >
                          {/* Event Type Badge */}
                          <div className="absolute top-2 right-2">
                            <div className="px-2 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                              {isHospital ? "🏥" : "📚"}
                            </div>
                          </div>

                          {/* Time */}
                          <div className="font-bold text-lg mb-2">
                            {format12h(b.startsAt.getUTCHours())} - {format12h(b.endsAt.getUTCHours())}
                          </div>
                          
                          {/* Topic */}
                          {b.topic && (
                            <div className="font-semibold text-lg mb-3 pr-12">
                              {b.topic}
                            </div>
                          )}
                          
                          {/* Details */}
                          <div className="space-y-2">
                            {b.tutor && (
                              <div className="flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-medium">{b.tutor}</span>
                              </div>
                            )}
                            
                            {b.location && (
                              <div className="flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-medium">{b.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Join Meeting Button */}
                          {b.link && (
                            <div className="mt-4">
                              <a
                                href={b.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Join Meeting
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Legend */}
      <div className="md:hidden mt-6 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full theme-gradient"></div>
          <span className="text-sm font-medium text-primary">Hospital Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary"></div>
          <span className="text-sm font-medium text-primary">Lecture</span>
        </div>
      </div>
    </Shell>
  );
}
