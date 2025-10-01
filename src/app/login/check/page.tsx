// src/app/login/check/page.tsx
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function CheckEmail() {
  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="fixed top-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
          <div className="brand-title text-3xl font-bold">Clerkship</div>
        </div>

        <div className="w-full max-w-xl mt-14 gradient-card p-8 sm:p-10 text-center backdrop-blur-md">
        <p className="text-2xl sm:text-3xl font-semibold text-[#2F6F8F] mb-6">
          Check your university email inbox for the access link.
        </p>
        <p className="text-readable-light text-lg">
          (Once received close this page)
        </p>
      </div>
      </main>
    </>
  );
}
