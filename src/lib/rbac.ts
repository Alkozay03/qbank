// src/lib/rbac.ts
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Role } from "@prisma/client";

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
 * Normalize any role-like input to the Prisma Role enum value.
 * Accepts variations like "ADMIN", "Admin", "member", Role.User, etc.
 */
export function normalizeRole(r: Role | keyof typeof Role | string): Role {
  const key = String(r).toUpperCase();
  const map: Record<string, Role> = {
    ADMIN: Role.Admin,
    USER: Role.User,
    MEMBER: Role.User,
    MASTER_ADMIN: Role.MASTER_ADMIN,
    WEBSITE_CREATOR: Role.WEBSITE_CREATOR,
  };

  const normalized = map[key];
  if (!normalized) throw new Error(`Unknown role: ${String(r)}`);
  return normalized;
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
  const userRole = normalizeRole(user.role);
  console.error("🔍 [RBAC] User role:", userRole);
  console.error("🔍 [RBAC] Allowed roles:", Array.from(allow));
  console.error("🔍 [RBAC] Role check:", allow.has(userRole));
  
  if (!allow.has(userRole)) {
    console.error("🔴 [RBAC] FORBIDDEN! User role not in allowed set");
    throw new HttpError(403, "Forbidden");
  }

  return { email, role: userRole };
}
