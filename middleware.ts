// /middleware.ts  (project root)
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = [
  "/", "/login", "/login/check", "/pending-approval",
  "/api/dev-magic", "/api/health", "/api/auth/register",
  "/api/auth", "/_next", "/favicon.ico", "/assets",
];

function isPublic(pathname: string) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Email callback - allow through (NextAuth handles token validation) ---
  if (pathname.startsWith("/api/auth/callback/email")) {
    // Note: We used to check for email-intent cookie here, but that prevented
    // users from clicking the magic link in a different browser/device than
    // where they requested it. NextAuth's built-in token validation is sufficient.
    
    // Clear the intent cookie if it exists (for same-browser flow)
    const res = NextResponse.next();
    const hasIntent = req.cookies.get("email-intent")?.value === "1";
    if (hasIntent) {
      res.cookies.set({ name: "email-intent", value: "", path: "/", maxAge: 0 });
    }
    return res;
  }

  // --- Public routes (and /login → /years if already signed in) ---
  if (isPublic(pathname)) {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
    const token = await getToken({ req, secret });
    
    // Check approval status for authenticated users
    if (token?.email && pathname !== "/pending-approval") {
      const approvalStatus = (token as { approvalStatus?: string }).approvalStatus;
      if (approvalStatus === "PENDING") {
        return NextResponse.redirect(new URL("/pending-approval", req.url));
      }
    }
    
    if (pathname === "/login") {
      if (token) {
        // If PENDING, go to pending-approval, else go to years
        const approvalStatus = (token as { approvalStatus?: string }).approvalStatus;
        if (approvalStatus === "PENDING") {
          return NextResponse.redirect(new URL("/pending-approval", req.url));
        }
        return NextResponse.redirect(new URL("/years", req.url));
      }
    }
    if (pathname === "/") {
      // Fallback: detect session cookie directly if decoding fails
      const hasSessionCookie = Boolean(
        req.cookies.get("next-auth.session-token")?.value ||
        req.cookies.get("__Secure-next-auth.session-token")?.value ||
        req.cookies.get("authjs.session-token")?.value ||
        req.cookies.get("__Secure-authjs.session-token")?.value
      );
      if (token || hasSessionCookie) {
        // If PENDING, go to pending-approval, else go to years
        if (token) {
          const approvalStatus = (token as { approvalStatus?: string }).approvalStatus;
          if (approvalStatus === "PENDING") {
            return NextResponse.redirect(new URL("/pending-approval", req.url));
          }
        }
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

  // --- Check approval status for authenticated users ---
  // If user is PENDING and trying to access anything other than pending-approval, redirect
  if (token.email && pathname !== "/pending-approval") {
    const approvalStatus = (token as { approvalStatus?: string }).approvalStatus;
    if (approvalStatus === "PENDING") {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
