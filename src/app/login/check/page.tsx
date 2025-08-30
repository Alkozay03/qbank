// src/app/login/check/page.tsx
import AuthTopBar from "@/components/AuthTopBar";

export default function CheckEmail() {
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
          w-full max-w-xl
          mt-14
          rounded-2xl
          bg-white
          shadow
          p-6 sm:p-8
          border border-[#E6F0F7]
          text-center
        "
      >
        <p className="text-lg sm:text-xl font-semibold text-[#56A2CD]">
          Check your university email inbox for the access link.
        </p>
        <p className="mt-2 text-slate-700">
          (Once received close this page)
        </p>
      </div>
    </main>
  );
}
