// src/middleware.ts
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
