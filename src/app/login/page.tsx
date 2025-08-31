// src/app/login/page.tsx
"use client";

import { Suspense } from "react";
import AuthTopBar from "@/components/AuthTopBar";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Login() {
  // Wrap the inner component (which uses useSearchParams) in Suspense.
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
  const [remember, setRemember] = useState(true); // default ON to match 45-day session
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

      // We control navigation (no NextAuth redirect here)
      const res = await signIn("email", {
        email,
        redirect: false,
        // pass a hint we could use later if you want to customize behavior
        callbackUrl,
        remember: remember ? "1" : "0",
      });

      if (res?.error) {
        setMsg("Could not send the magic link. Please try again.");
        setSending(false);
        return;
      }

      // Show your custom "check inbox" screen
      router.push("/login/check");
    } catch (err) {
      console.error(err);
      setMsg("Could not send the magic link. Please try again.");
      setSending(false);
    }
  }

  return (
    <main
      className="
        min-h-screen
        flex items-center justify-center
        px-4
        bg-gradient-to-b from-[#F3F9FC] via-[#CCE3F0] to-[#FFFFFF]
      "
    >
      <AuthTopBar />

      <div
        className="
          w-full max-w-md
          mt-14
          rounded-2xl
          bg-white
          shadow
          p-6 sm:p-8
          border border-[#E6F0F7]
        "
      >
        <h1 className="text-2xl font-bold text-[#56A2CD] text-center">Sign in</h1>
        <p className="mt-2 text-center text-sm text-[#7DB8D9]">
          Enter your university email
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
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
              className="
                mt-1 w-full rounded-xl
                border border-slate-300
                bg-white px-3 py-2
                text-slate-900
                outline-none
                focus:ring-2 focus:ring-[#A5CDE4]
              "
            />
          </div>

          {/* Remember Me */}
          <label className="flex items-center gap-2 select-none text-sm text-slate-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#56A2CD] focus:ring-[#A5CDE4]"
            />
            Remember Me
          </label>

          {msg && <p className="text-sm text-center text-red-600">{msg}</p>}

          <button
            type="submit"
            disabled={sending}
            aria-busy={sending}
            className="
              w-full
              rounded-2xl
              px-4 py-2
              font-semibold
              text-white
              bg-[#7DB8D9]
              shadow
              transition
              duration-200
              ease-out
              hover:scale-[1.02] hover:bg-[#56A2CD]
              active:scale-[0.99]
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A5CDE4]
            "
          >
            {sending ? "Sending…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}