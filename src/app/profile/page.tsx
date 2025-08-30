// src/app/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopRightBar from "@/components/TopRightBar";

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

  const backTo = useRef<string>("/year4");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
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
      // Prefer explicit back target from sessionStorage (set by TopRightBar),
      // then fall back to last-page, then as a final default go to /years.
      let to = "/years";
      try {
        to =
          sessionStorage.getItem("profileBackTo") ||
          localStorage.getItem("last-page") ||
          "/years";
        // clear it so future visits don’t use a stale route
        sessionStorage.removeItem("profileBackTo");
      } catch {}
      router.push(to);
    }
  }


  if (!me) return null;

  return (
    <main className="min-h-screen bg-[#F7FBFF] flex flex-col">
      <TopRightBar />
      <div className="fixed left-0 top-0 h-14 flex items-center px-4 text-3xl font-extrabold tracking-tight text-[#56A2CD]">
        Clerkship
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-[#2F6F8F] mb-6 text-center">
            Profile
          </h1>

          <form
  onSubmit={onSave}
  className="space-y-4 rounded-2xl border border-[#CCE3F0] bg-white shadow-xl p-8"
>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Field name="firstName" label="First Name" defaultValue={me.firstName ?? ""} />
    <Field name="lastName" label="Last Name" defaultValue={me.lastName ?? ""} />
  </div>

  <Field
    name="gradYear"
    label="Expected Year of Graduation"
    type="number"
    defaultValue={me.gradYear ?? ""}
  />

  <ReadOnlyField label="Email" value={me.email} />
  <ReadOnlyField label="Role" value={me.role ?? "Member"} />

  <div className="flex justify-end">
    <button
      type="submit"
      disabled={saving}
      className="rounded-2xl px-6 py-2 font-semibold text-white bg-[#7DB8D9] hover:bg-[#56A2CD] shadow transition disabled:opacity-60"
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

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-[#2F6F8F]">{label}</div>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-[#CCE3F0] bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#A5CDE4]"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-[#2F6F8F]">{label}</div>
      <input
        value={value}
        readOnly
        className="mt-1 w-full rounded-xl border border-[#E6F0F7] bg-slate-50 px-3 py-2 text-slate-900"
      />
    </label>
  );
}
