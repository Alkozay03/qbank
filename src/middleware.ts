// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public routes (same behavior you had)
const PUBLIC = [
  "/", "/login", "/login/check", "/years",
  "/api/dev-magic", "/api/health",
  "/api/auth", "/_next", "/favicon.ico", "/assets",
];
function isPublic(pathname: string) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p));
}

// Block link-scanners ONLY on the email callback
const BOT_SIGNS = [
  "google-safebrowsing","google-inspectiontool","apis-google",
  "gmailimageproxy","googleimageproxy","outlook","microsoft office",
  "yahoo","barracuda","proofpoint","slackbot","discordbot",
  "facebookexternalhit","twitterbot","skypeuripreview","linkpreview",
  "link-checker","curl","python-requests"
].map(s => s.toLowerCase());

function looksLikeBot(req: NextRequest) {
  const h = (n: string) => (req.headers.get(n) || "").toLowerCase();
  const ua = h("user-agent");
  const purpose = h("purpose") + " " + h("sec-purpose");
  const dest = h("sec-fetch-dest");
  const mode = h("sec-fetch-mode");
  const user = h("sec-fetch-user");
  const accept = h("accept");

  const isHeadOrOptions = req.method === "HEAD" || req.method === "OPTIONS";
  const uaBot = BOT_SIGNS.some(sig => ua.includes(sig)) || /bot|crawler|spider/i.test(ua);
  const isPrefetch = purpose.includes("prefetch") || dest.includes("prefetch");
  // A real user navigation usually has these; Safari may miss sec-fetch headers
  const likelyHuman =
    req.method === "GET" &&
    (user.includes("?1") || dest.includes("document") || /text\/html/.test(accept)) &&
    /(chrome|safari|firefox|edg)/i.test(ua);

  return isHeadOrOptions || uaBot || isPrefetch || !likelyHuman;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Protect NextAuth email callback tokens
  if (pathname.startsWith("/api/auth/callback/email")) {
    if (looksLikeBot(req)) {
      // Don’t let scanners burn the one-time token
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.next();
  }

  // 2) Allow public paths (and your /login→/years auto-redirect if already signed in)
  if (isPublic(pathname)) {
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
