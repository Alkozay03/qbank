// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Reuse a single PrismaClient in dev; create fresh in prod
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ["query"], // uncomment if you want query logs in dev
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
