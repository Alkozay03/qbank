// src/lib/adapter.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import { cookies as nextCookies } from "next/headers";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Prisma } from "@prisma/client";

/**
 * Wrap PrismaAdapter to customize session expiration
 * based on a "rememberMe" cookie—without using `any`.
 */

type CookieJar = { get(_name: string): { value?: string } | undefined };

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

    async getUser(id) {
      const u = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      });
      if (!u) return null;
      const name = [u.firstName ?? "", u.lastName ?? ""].join(" ").trim() || null;
      return {
        id: u.id,
        name,
        email: u.email,
        emailVerified: null,
        image: u.image ?? null,
      } satisfies AdapterUser;
    },

    // Override to avoid selecting non-existent columns (e.g., legacy `rotation`).
    async getUserByEmail(email) {
      const u = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          image: true,
          // meta
          createdAt: true,
          // updatedAt: true, // Column doesn't exist yet
          gradYear: true,
          role: true,
        },
      });
      if (!u) return null;
      const name = [u.firstName ?? "", u.lastName ?? ""].join(" ").trim() || null;
      return {
        id: u.id,
        name,
        email: u.email,
        emailVerified: null,
        image: u.image ?? null,
      } satisfies AdapterUser;
    },

    async createUser(data) {
      // Map `name` -> firstName/lastName if provided
      let firstName: string | null = null;
      let lastName: string | null = null;
      if (data.name) {
        const parts = String(data.name).trim().split(/\s+/);
        firstName = parts[0] ?? null;
        lastName = parts.slice(1).join(" ") || null;
      }
      const u = await prisma.user.create({
        data: {
          email: data.email!,
          firstName,
          lastName,
          image: data.image ?? null,
        },
        select: { id: true, email: true, firstName: true, lastName: true, image: true },
      });
      const name = [u.firstName ?? "", u.lastName ?? ""].join(" ").trim() || null;
      return { id: u.id, name, email: u.email, emailVerified: null, image: u.image ?? null } satisfies AdapterUser;
    },

    async updateUser(data) {
      if (!data.id) throw new Error("updateUser: missing id");
      // Ignore fields we don't have in schema (e.g., emailVerified, rotation)
      const toUpdate: Prisma.UserUpdateInput = {};
      if (typeof data.email === "string") toUpdate.email = data.email;
      if (typeof data.name === "string") {
        const parts = data.name.trim().split(/\s+/);
        const firstName = parts[0] ?? null;
        const lastName = parts.slice(1).join(" ") || null;
        toUpdate.firstName = firstName;
        toUpdate.lastName = lastName;
      }
      if (typeof data.image === "string") toUpdate.image = data.image;

      const u = await prisma.user.update({
        where: { id: data.id },
        data: toUpdate,
        select: { id: true, email: true, firstName: true, lastName: true, image: true },
      });
      const name = [u.firstName ?? "", u.lastName ?? ""].join(" ").trim() || null;
      return { id: u.id, name, email: u.email, emailVerified: null, image: u.image ?? null } satisfies AdapterUser;
    },

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
