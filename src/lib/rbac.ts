// src/lib/rbac.ts
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import type { Role } from "@prisma/client";

/**
 * Error with HTTP status that route handlers may choose to catch.
 */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Normalize inputs like "ADMIN" | Role.ADMIN | "MEMBER" -> "ADMIN" | "MEMBER" | "MASTER_ADMIN"
 */
function normalizeRole(r: Role | keyof typeof Role | string): Role {
  const s = typeof r === "string" ? r.toUpperCase() : r;
  // Prisma Role enum values are "MEMBER" | "ADMIN" | "MASTER_ADMIN"
  if (s === "ADMIN" || s === "MEMBER" || s === "MASTER_ADMIN") return s as Role;
  throw new Error(`Unknown role: ${String(r)}`);
}

/**
 * Ensures the signed-in user exists and has one of the allowed roles.
 * Usage:
 *   await requireRole(["ADMIN", "MASTER_ADMIN"]);
 * Returns the { email, role } if allowed.
 * Throws HttpError(401/403) otherwise.
 */
export async function requireRole(
  allowed: Array<Role | keyof typeof Role | string>
): Promise<{ email: string; role: Role }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new HttpError(401, "Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (!user) throw new HttpError(401, "Unauthorized");

  const allow = new Set(allowed.map(normalizeRole));
  if (!allow.has(user.role)) {
    throw new HttpError(403, "Forbidden");
  }

  return { email, role: user.role };
}
