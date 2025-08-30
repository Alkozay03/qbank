// src/app/year5/page.tsx
import TopRightBar from "@/components/TopRightBar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Year5() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7FBFF]">
      <TopRightBar />
      <div className="fixed left-0 top-0 h-14 flex items-center px-4 text-2xl font-extrabold tracking-tight text-[#56A2CD]">
        Clerkship
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#2F6F8F]">Year 5 — Coming Soon</h1>
      </div>
    </main>
  );
}
