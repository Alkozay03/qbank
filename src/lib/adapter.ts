// src/lib/adapter.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import { cookies as nextCookies } from "next/headers";
import type { Adapter } from "next-auth/adapters";

/**
 * Wrap PrismaAdapter to customize session expiration
 * based on a "rememberMe" cookie—without using `any`.
 */

type CookieJar = { get(name: string): { value?: string } | undefined };

function isCookieJar(v: unknown): v is CookieJar {
  return !!v && typeof (v as { get?: unknown }).get === "function";
}

function isPromise<T>(v: unknown): v is Promise<T> {
  return !!v && typeof (v as { then?: unknown }).then === "function";
}

export function ClerkshipAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,

    async createSession(data) {
      let remember = false;

      try {
        const maybe = nextCookies() as unknown;

        const jarResolved = isPromise<unknown>(maybe) ? await maybe : maybe;
        if (isCookieJar(jarResolved)) {
          remember = jarResolved.get("rememberMe")?.value === "1";
        }
      } catch {
        // In some contexts (e.g., non-request), cookies() may be unavailable—ignore.
      }

      const days = remember ? 45 : 1;
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      if (!base.createSession) {
        throw new Error("Adapter.createSession is not available on PrismaAdapter.");
      }

      return base.createSession({
        ...data,
        expires,
      });
    },
  };
}
