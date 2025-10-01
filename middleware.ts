// /middleware.ts  (project root)
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = [
  "/", "/login", "/login/check", "/years",
  "/api/dev-magic", "/api/health",
  "/api/auth", "/_next", "/favicon.ico", "/assets",
];

function isPublic(pathname: string) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Protect NextAuth email callback tokens ---
  if (pathname.startsWith("/api/auth/callback/email")) {
    // allow only if short-lived intent cookie is present (set by /login submit)
    const hasIntent = req.cookies.get("email-intent")?.value === "1";
    if (!hasIntent) {
      // block scanners/prefetchers; do NOT consume token
      return new NextResponse(null, { status: 204 });
    }
    // single-use: clear the cookie as we pass through
    const res = NextResponse.next();
    res.cookies.set({ name: "email-intent", value: "", path: "/", maxAge: 0 });
    return res;
  }

  // --- Public routes (and /login → /years if already signed in) ---
  if (isPublic(pathname)) {
    if (pathname === "/login") {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
      const token = await getToken({ req, secret });
      if (token) return NextResponse.redirect(new URL("/years", req.url));
    }
    if (pathname === "/") {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
      const token = await getToken({ req, secret });
      // Fallback: detect session cookie directly if decoding fails
      const hasSessionCookie = Boolean(
        req.cookies.get("next-auth.session-token")?.value ||
        req.cookies.get("__Secure-next-auth.session-token")?.value ||
        req.cookies.get("authjs.session-token")?.value ||
        req.cookies.get("__Secure-authjs.session-token")?.value
      );
      if (token || hasSessionCookie) {
        return NextResponse.redirect(new URL("/years", req.url));
      }
    }
    return NextResponse.next();
  }

  // --- Auth gate for everything else ---
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
  const token = await getToken({ req, secret });
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
