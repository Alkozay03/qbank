// src/app/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ThemePicker from "@/components/ThemePicker";

type Me = {
  firstName: string | null;
  lastName: string | null;
  gradYear: number | null;
  email: string;
  role?: string;
  timezone?: string;
  rotation?: string;
  rotationNumber?: string;
  theme?: string;
};

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);

  // Where to go after save; defaults to /year4 but overwritten from referrer/sessionStorage
  const backTo = useRef<string>("/year4");

  useEffect(() => {
    // Capture where the user came from (same-origin only)
    if (typeof window !== "undefined") {
      let from = sessionStorage.getItem("profileBackTo");
      if (!from && document.referrer) {
        try {
          const url = new URL(document.referrer);
          if (url.origin === window.location.origin) {
            from = url.pathname + url.search;
          }
        } catch {}
      }
      if (from) {
        sessionStorage.setItem("profileBackTo", from);
        backTo.current = from;
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (!r.ok) {
        setLoading(false);
        return; // unauthorized etc.
      }
      const data = (await r.json()) as Me;
      setMe(data);
      setTimeout(() => setLoading(false), 100);
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const form = e.target as HTMLFormElement;
    const body = new FormData(form);

    try {
      const r = await fetch("/api/profile", { 
        method: "POST", 
        body,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (r.ok) {
        // Refetch the profile data to update local state
        const updatedData = await r.json();
        setMe(updatedData);
        
        // Small delay to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate back to previous page after saving
        const to = sessionStorage.getItem("profileBackTo") || backTo.current || "/year4";
        sessionStorage.removeItem("profileBackTo");
        
        // Use router.replace for cleaner navigation
        router.replace(to);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !me) return null;

  return (
    <main className="min-h-screen bg-background theme-transition">
      {/* Top brand + (icons handled elsewhere if needed) */}
      <div className="py-6 px-6 flex items-center justify-between bg-primary">
        <span className="font-black text-4xl text-inverse">Clerkship</span>
      </div>

      {/* Center container vertically and horizontally */}
      <div className="min-h-[calc(100vh-96px)] flex items-center justify-center px-4 pt-8">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-bold mb-6 mt-8 text-center text-primary">
            Profile Settings
          </h1>

          <form
            onSubmit={onSave}
            className="rounded-2xl border border-theme bg-theme-background shadow-theme p-6 space-y-4 theme-transition"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">
                  First Name
                </label>
                <input
                  name="firstName"
                  defaultValue={me.firstName ?? ""}
                  className="w-full rounded-xl border border-theme px-3 py-2 outline-none focus-theme theme-transition text-readable bg-theme-background"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">
                  Last Name
                </label>
                <input
                  name="lastName"
                  defaultValue={me.lastName ?? ""}
                  className="w-full rounded-xl border border-theme px-3 py-2 outline-none focus-theme theme-transition text-readable bg-theme-background"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">
                  Expected Year of Graduation
                </label>
                <input
                  name="gradYear"
                  type="number"
                  min={2024}
                  max={2100}
                  defaultValue={me.gradYear ?? ""}
                  className="w-full rounded-xl border border-theme px-3 py-2 outline-none focus-theme theme-transition text-readable bg-theme-background"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">Email</label>
                <input
                  value={me.email}
                  readOnly
                  className="w-full rounded-xl border border-theme bg-theme-tertiary px-3 py-2 text-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">Role</label>
                <input
                  value={me.role ?? "Member"}
                  readOnly
                  className="w-full rounded-xl border border-theme bg-theme-tertiary px-3 py-2 text-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">
                  Current Rotation
                </label>
                <select
                  name="rotation"
                  defaultValue={me.rotation ?? ""}
                  className="w-full rounded-xl border border-theme px-3 py-2 outline-none focus-theme theme-transition text-readable bg-theme-background"
                >
                  <option value="">Select Rotation</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="General Surgery">General Surgery</option>
                  <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">
                  Rotation Number
                </label>
                <select
                  name="rotationNumber"
                  defaultValue={me.rotationNumber ?? ""}
                  className="w-full rounded-xl border border-theme px-3 py-2 outline-none focus-theme theme-transition text-readable bg-theme-background"
                >
                  <option value="">Select Rotation Number</option>
                  <option value="R1">R1</option>
                  <option value="R2">R2</option>
                  <option value="R3">R3</option>
                  <option value="R4">R4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-readable">
                  Preferred Timezone (Optional)
                </label>
                <select
                  name="timezone"
                  defaultValue={me.timezone ?? ""}
                  className="w-full rounded-xl border border-theme px-3 py-2 outline-none focus-theme theme-transition text-readable bg-theme-background"
                >
                  <option value="">Use Local Time Only</option>
                  <optgroup label="Americas">
                    <option value="America/New_York">New York (EST/EDT)</option>
                    <option value="America/Chicago">Chicago (CST/CDT)</option>
                    <option value="America/Denver">Denver (MST/MDT)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                    <option value="America/Toronto">Toronto</option>
                    <option value="America/Vancouver">Vancouver</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Europe/Berlin">Berlin</option>
                    <option value="Europe/Rome">Rome</option>
                    <option value="Europe/Madrid">Madrid</option>
                    <option value="Europe/Amsterdam">Amsterdam</option>
                  </optgroup>
                  <optgroup label="Asia">
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Shanghai">Shanghai</option>
                    <option value="Asia/Hong_Kong">Hong Kong</option>
                    <option value="Asia/Singapore">Singapore</option>
                    <option value="Asia/Seoul">Seoul</option>
                    <option value="Asia/Dubai">Dubai</option>
                  </optgroup>
                  <optgroup label="Middle East">
                    <option value="Asia/Riyadh">Saudi Arabia</option>
                    <option value="Asia/Kuwait">Kuwait</option>
                    <option value="Asia/Qatar">Qatar</option>
                    <option value="Asia/Bahrain">Bahrain</option>
                    <option value="Asia/Dubai">United Arab Emirates</option>
                    <option value="Asia/Muscat">Oman</option>
                    <option value="Asia/Tehran">Iran</option>
                    <option value="Asia/Baghdad">Iraq</option>
                    <option value="Asia/Damascus">Syria</option>
                    <option value="Asia/Beirut">Lebanon</option>
                    <option value="Asia/Amman">Jordan</option>
                    <option value="Asia/Jerusalem">Palestine</option>
                    <option value="Europe/Istanbul">Turkey</option>
                    <option value="Africa/Cairo">Egypt</option>
                  </optgroup>
                  <optgroup label="Australia">
                    <option value="Australia/Sydney">Sydney</option>
                    <option value="Australia/Melbourne">Melbourne</option>
                    <option value="Australia/Perth">Perth</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Theme Picker Section */}
            <div className="mt-8 mb-6 rounded-2xl border border-theme bg-theme-background shadow-theme p-6 theme-transition">
              <ThemePicker />
            </div>

            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-primary px-8 py-3 font-bold text-inverse shadow-theme hover:opacity-90 disabled:opacity-60 theme-transition"
              >
                {saving ? "Saving…" : "Save & Return"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
