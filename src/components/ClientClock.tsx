// src/components/ClientClock.tsx
"use client";

import { useEffect, useState } from "react";

interface User {
  timezone?: string;
}

interface ClientClockProps {
  user?: User;
}

export default function ClientClock({ user }: ClientClockProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Format time for local timezone
  const localTime = now.toLocaleTimeString();
  const localDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get user's local country/region name
  let localCountry = 'Local Time';
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    localCountry = getCountryNameFromTimezone(userTimezone);
  } catch {
    localCountry = 'Local Time';
  }

  // Format time for user's preferred timezone if set
  let preferredTime = "";
  let preferredDate = "";
  let preferredCountry = "";

  if (user?.timezone) {
    try {
      preferredTime = now.toLocaleTimeString(undefined, {
        timeZone: user.timezone,
      });
      preferredDate = now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: user.timezone,
      });
      
      // Get proper country name for preferred timezone
      preferredCountry = getCountryNameFromTimezone(user.timezone);
    } catch {
      // Invalid timezone, fall back to local time
    }
  }

  // Helper function to get country name from timezone
  function getCountryNameFromTimezone(timezone: string): string {
    // Middle East country mappings
    const middleEastMappings: { [key: string]: string } = {
      'Asia/Riyadh': 'Saudi Arabia',
      'Asia/Kuwait': 'Kuwait',
      'Asia/Qatar': 'Qatar', 
      'Asia/Bahrain': 'Bahrain',
      'Asia/Dubai': 'United Arab Emirates',
      'Asia/Muscat': 'Oman',
      'Asia/Tehran': 'Iran',
      'Asia/Baghdad': 'Iraq',
      'Asia/Damascus': 'Syria',
      'Asia/Beirut': 'Lebanon',
      'Asia/Amman': 'Jordan',
      'Asia/Jerusalem': 'Palestine',
      'Europe/Istanbul': 'Turkey',
      'Africa/Cairo': 'Egypt'
    };

    // Check if it's a Middle East timezone
    if (middleEastMappings[timezone]) {
      return middleEastMappings[timezone];
    }

    // For other timezones, extract city name
    const parts = timezone.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  }

  return (
    <div className="text-center">
      {/* Single timezone or side-by-side layout */}
      {user?.timezone && preferredTime ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-6xl mx-auto">
          {/* Local Time */}
          <div className="text-center">
            <div className="text-lg font-medium text-slate-600 mb-2">{localCountry}</div>
            <div className="text-2xl font-semibold text-[#2F6F8F] mb-3">
              {localDate}
            </div>
            <div className="text-4xl font-extrabold text-[#2F6F8F]">
              {localTime}
            </div>
          </div>

          {/* Preferred Timezone */}
          <div className="text-center">
            <div className="text-lg font-medium text-slate-600 mb-2">{preferredCountry}</div>
            <div className="text-2xl font-semibold text-[#2F6F8F] mb-3">
              {preferredDate}
            </div>
            <div className="text-4xl font-extrabold text-[#2F6F8F]">
              {preferredTime}
            </div>
          </div>
        </div>
      ) : (
        /* Local Time Only */
        <div>
          <div className="text-2xl font-semibold text-[#2F6F8F] mb-3">
            {localDate}
          </div>
          <div className="text-4xl font-extrabold text-[#2F6F8F]">
            {localTime}
          </div>
        </div>
      )}
    </div>
  );
}
