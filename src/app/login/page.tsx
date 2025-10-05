// src/app/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import ForceBlueTheme from "@/components/ForceBlueTheme";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { getGradientTextClasses } from "@/utils/gradients";

export default function Login() {
  return (
    <ForceBlueTheme>
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </ForceBlueTheme>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/years";

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [remember, setRemember] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      // Provide more specific error messages
      if (error === "Verification") {
        setMsg("This login link has already been used or has expired. Please request a new one.");
      } else if (error === "Configuration") {
        setMsg("Login configuration error. Please contact support.");
      } else {
        setMsg("Login failed. Make sure you used your university email and click the link only once.");
      }
    }
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

      // NEW FLOW: Register user first (creates account with PENDING status)
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const registerData = await registerRes.json();

      if (!registerData.success) {
        setMsg(registerData.error || "Registration failed");
        setSending(false);
        return;
      }

      // If user is PENDING (new or existing), show pending approval page
      if (registerData.status === "PENDING") {
        router.push("/pending-approval");
        return;
      }

      // If user is APPROVED, send them the magic link
      if (registerData.status === "APPROVED") {
        // Persist remember choice in a cookie (45 days)
        try {
          if (remember) {
            const maxAge = 45 * 24 * 60 * 60; // 45 days
            document.cookie = `remember=1; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
          } else {
            document.cookie = `remember=; Max-Age=0; Path=/; SameSite=Lax`;
          }
        } catch {}

        // Mark intent for email callback protection
        await fetch("/api/auth/email-intent", { method: "POST", credentials: "include" });

        // Request the magic link (only for APPROVED users)
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
      }
    } catch (err) {
      console.error(err);
      setMsg("An error occurred. Please try again.");
      setSending(false);
    }
  }

  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        {/* Top left brand with white background */}
        <div className="fixed top-4 left-4 bg-white rounded-xl px-5 py-2.5 shadow-lg">
          <div className={`brand-title text-3xl font-extrabold tracking-tight ${getGradientTextClasses()}`}>
            Clerkship
          </div>
        </div>

        {/* Main login card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          {/* Sign in header - sky blue */}
          <h1 className="text-3xl font-extrabold text-center mb-3 text-sky-500">Sign in</h1>
          
          {/* Subtitle - light sky blue */}
          <p className="text-center text-sm text-sky-400 mb-6">Enter your university email</p>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-sky-500 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-base text-sky-400 bg-white border-2 border-sky-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-sky-500 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-base text-sky-400 bg-white border-2 border-sky-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>

            {/* University Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-sky-500 mb-1">
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
                className="w-full px-3 py-2 text-base text-sky-400 bg-white border-2 border-sky-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Remember Me - light sky blue with custom checkbox */}
            <label className="flex items-center gap-2 select-none text-sm text-sky-400 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="appearance-none h-4 w-4 border-2 border-sky-500 rounded checked:border-0 checked:bg-gradient-to-br checked:from-sky-400 checked:to-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-200 cursor-pointer relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:top-1/2 checked:after:left-1/2 checked:after:transform checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
              />
              Remember Me
            </label>

            {msg && <p className="text-sm text-center text-red-600 font-medium">{msg}</p>}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={sending}
              aria-busy={sending}
              className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold text-lg px-8 py-3 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ transform: 'scale(1)', transition: 'all 0.3s ease-in-out' }}
              onMouseEnter={(e) => !sending && (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseDown={(e) => !sending && (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => !sending && (e.currentTarget.style.transform = 'scale(1.05)')}
            >
              {sending ? "Processing..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
