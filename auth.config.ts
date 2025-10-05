// auth.config.ts
import type { NextAuthConfig, Session } from "next-auth";
import type { NextRequest } from "next/server";

export default {
  // IMPORTANT: keep providers empty in auth.config.ts so middleware stays Edge compatible.
  providers: [],

  // Trust localhost for development and production
  trustHost: true,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request }: { auth: Session | null; request: NextRequest }) {
      const { pathname } = new URL(request.url);
      const protectedRoots = ["/years", "/year4", "/year5", "/performance", "/quiz", "/profile"];
      const isProtected =
        protectedRoots.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
        pathname === "/quiz/new";

      if (!isProtected) return true;
      return !!auth?.user?.email;
    },
  },
} satisfies NextAuthConfig;
