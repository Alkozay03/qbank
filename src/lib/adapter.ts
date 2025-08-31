// src/lib/adapter.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { cookies as nextCookies } from "next/headers";
import type { Adapter } from "next-auth/adapters";

/**
 * Wrap PrismaAdapter to customize session expiration
 * based on a "rememberMe" cookie.
 */
export function ClerkshipAdapter(): Adapter {
  const base = PrismaAdapter(db);

  return {
    ...base,

    async createSession(data) {
      // Next.js cookies() is sync; read and compute expiry here.
      const jar = nextCookies();
      const remember = jar.get("rememberMe")?.value === "1";
      const days = remember ? 45 : 1;
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Delegate to Prisma adapter with our custom expires
      return base.createSession({
        ...data,
        expires,
      });
    },
  };
}
