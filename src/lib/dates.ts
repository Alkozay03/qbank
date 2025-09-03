// src/lib/dates.ts
export function startOfWeekMonday(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // move to Monday
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function format12h(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:00 ${ampm}`;
}

// nice for rendering date headings
export function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
