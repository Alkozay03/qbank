// src/lib/adapter.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { cookies as nextCookies } from "next/headers";

export function ClerkshipAdapter() {
  const base = PrismaAdapter(db) as any;

  return {
    ...base,

    /** Set session.expires based on our rememberMe cookie */
    async createSession(data: any) {
      try {
        const jar = await (nextCookies() as any); // Next 15: cookies() must be awaited
        const remember = jar?.get?.("rememberMe")?.value === "1";
        const days = remember ? 45 : 1;
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        return base.createSession({ ...data, expires });
      } catch {
        const expires = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        return base.createSession({ ...data, expires });
      }
    },
  };
}
