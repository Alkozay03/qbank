// src/app/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/years";

  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (error) setMsg("Login failed. Make sure you used your university email.");
  }, [error]);

  function isAllowedEmail(e: string) {
    return /^u\d{8}@sharjah\.ac\.ae$/i.test(e.trim());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!isAllowedEmail(email)) {
      setMsg("Email not allowed");
      return;
    }

    try {
      setSending(true);

      // 1) mark intent so only this browser can consume the magic link
      await fetch("/api/auth/email-intent", { method: "POST", credentials: "include" });

      // Persist remember choice in a cookie (45 days)
      try {
        if (remember) {
          const maxAge = 45 * 24 * 60 * 60; // 45 days
          document.cookie = `remember=1; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
        } else {
          document.cookie = `remember=; Max-Age=0; Path=/; SameSite=Lax`;
        }
      } catch {}

      // 2) request the magic link (no redirect — we show the “check inbox” page)
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl,
        remember: remember ? "1" : "0",
      });

      if (res?.error) {
        setMsg("Could not send the magic link. Please try again.");
        setSending(false);
        return;
      }

      router.push("/login/check");
    } catch (err) {
      console.error(err);
      setMsg("Could not send the magic link. Please try again.");
      setSending(false);
    }
  }

  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="fixed top-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
          <div className="brand-title text-3xl font-bold">Clerkship</div>
        </div>
        <div className="w-full max-w-lg mt-14 gradient-card shadow-lg p-8 sm:p-10 backdrop-blur-md">
        <h1 className="text-4xl font-bold text-center mb-6 text-[#2F6F8F]">Sign in</h1>
        <p className="text-center text-lg text-readable-light mb-8">Enter your university email</p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-base font-semibold text-readable mb-3">
              University Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="u12345678@sharjah.ac.ae"
              className="gradient-input text-lg py-4"
            />
          </div>

          <label className="flex items-center gap-2 select-none text-sm text-readable">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#2F6F8F] focus:ring-2 focus:ring-[#2F6F8F]"
            />
            Remember Me
          </label>

          {msg && <p className="text-sm text-center text-red-600">{msg}</p>}

          <button
            type="submit"
            disabled={sending}
            aria-busy={sending}
            className="gradient-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
    </>
  );
}
