// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public routes (unchanged)
const PUBLIC = [
  "/", "/login", "/login/check", "/years",
  "/api/dev-magic", "/api/health",
  "/api/auth", "/_next", "/favicon.ico", "/assets",
];
function isPublic(pathname: string) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p));
}

// Very small bot/preview detector for the email callback
const BOT_SIGNS = [
  "google-safebrowsing",
  "google-inspectiontool",
  "apis-google",
  "gmailimageproxy",
  "googleimageproxy",
  "outlook",
  "microsoft office",
  "yahoo",
  "barracuda",
  "proofpoint",
  "slackbot",
  "discordbot",
  "facebookexternalhit",
  "twitterbot",
  "skypeuripreview",
  "linkpreview",
  "link-checker",
  "curl",
  "python-requests",
].map(s => s.toLowerCase());

function looksLikeBot(req: NextRequest) {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const purpose = (req.headers.get("purpose") || "").toLowerCase();
  const secPurpose = (req.headers.get("sec-purpose") || "").toLowerCase();
  const fetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  const isHeadOrOptions = req.method === "HEAD" || req.method === "OPTIONS";
  const isUAHit = BOT_SIGNS.some(sig => ua.includes(sig));
  const isPrefetch = purpose.includes("prefetch") || secPurpose.includes("prefetch") || fetchDest.includes("prefetch");
  return isUAHit || isPrefetch || isHeadOrOptions;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Protect the NextAuth email callback from link scanners ONLY.
  if (pathname.startsWith("/api/auth/callback/email")) {
    if (looksLikeBot(req)) {
      // Do NOT forward to NextAuth (would consume the one-time token)
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.next();
  }

  // 2) Allow public routes (including /api/auth/* as you already had)
  if (isPublic(pathname)) {
    // Your existing "if already signed in, redirect /login → /years"
    if (pathname === "/login") {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
      const token = await getToken({ req, secret });
      if (token) {
        const url = new URL("/years", req.url);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // 3) Gate everything else by session
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
  const token = await getToken({ req, secret });
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Keep your matcher
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
