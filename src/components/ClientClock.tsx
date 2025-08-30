// src/components/ClientClock.tsx
"use client";

import { useEffect, useState } from "react";

export default function ClientClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-10 text-center">
      <div className="text-2xl font-semibold text-[#2F6F8F]">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
      <div className="mt-2 text-4xl font-extrabold text-[#2F6F8F]">
        {now.toLocaleTimeString()}
      </div>
    </div>
  );
}
