import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { getGradientTextClasses } from "@/utils/gradients";

export default async function Home() {
  // Check authentication on the server - this runs BEFORE rendering
  const session = await auth();
  
  // Redirect logged-in users immediately (no flash!)
  if (session?.user) {
    redirect("/years");
  }
  
  // Only render the sign-in page if not logged in
  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="text-center bg-white rounded-3xl shadow-2xl p-16 max-w-2xl mx-auto">
          {/* Brand - Large with gradient text */}
          <h1 className={`brand-title text-7xl font-extrabold tracking-tight mb-4 ${getGradientTextClasses()}`}>
            Clerkship
          </h1>

          {/* Tagline */}
          <p className="text-2xl text-gray-600 mb-12 font-medium">
            Your guide to success!
          </p>

          {/* Sign-in button - using Link instead of button for server component */}
          <Link
            href="/login"
            className="inline-block bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold text-xl px-12 py-5 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
            aria-label="Sign in"
          >
            Sign in
          </Link>
        </div>
      </main>
    </>
  );
}
