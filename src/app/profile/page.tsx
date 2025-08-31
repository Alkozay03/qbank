// src/app/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  firstName: string | null;
  lastName: string | null;
  gradYear: number | null;
  email: string;
  role?: string;
};

export default function Profile() {
  const router = useRouter();
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
      if (!r.ok) return; // unauthorized etc.
      const data = (await r.json()) as Me;
      setMe(data);
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const form = e.target as HTMLFormElement;
    const body = new FormData(form);

    const r = await fetch("/api/profile", { method: "POST", body });
    setSaving(false);

    if (r.ok) {
      const to =
        sessionStorage.getItem("profileBackTo") || backTo.current || "/year4";
      router.push(to);
    }
  }

  if (!me) return null;

  return (
    <main className="min-h-screen bg-[#F7FBFF]">
      {/* Top brand + (icons handled elsewhere if needed) */}
      <div className="py-6 px-6 flex items-center justify-between">
        <span className="font-black text-4xl text-[#56A2CD]">Clerkship</span>
      </div>

      {/* Center container vertically and horizontally */}
      <div className="min-h-[calc(100vh-96px)] flex items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-bold text-[#2F6F8F] mb-4 text-center">
            Profile
          </h1>

          <form
            onSubmit={onSave}
            className="rounded-2xl border border-[#E6F0F7] bg-white/90 shadow p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  First Name
                </label>
                <input
                  name="firstName"
                  defaultValue={me.firstName ?? ""}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Last Name
                </label>
                <input
                  name="lastName"
                  defaultValue={me.lastName ?? ""}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Expected Year of Graduation
                </label>
                <input
                  name="gradYear"
                  type="number"
                  min={2024}
                  max={2100}
                  defaultValue={me.gradYear ?? ""}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  value={me.email}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Role</label>
                <input
                  value={me.role ?? "Member"}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#7DB8D9] px-6 py-3 font-bold text-white shadow hover:bg-[#56A2CD] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
