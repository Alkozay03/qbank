import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("can't reach database")) return true;
    if (message.includes("failed to connect")) return true;
    if (message.includes("connection refused")) return true;
    if (message.includes("database server")) return true;
    if (message.includes("timeout")) return true;
    for (const code of NETWORK_ERROR_CODES) {
      if (message.includes(code.toLowerCase())) return true;
    }
  }

  return false;
}

export function databaseUnavailableResponse() {
  return NextResponse.json(
    {
      error: "database_unavailable",
      message:
        "The database is currently unreachable. Please ensure your local database is running or update DATABASE_URL/LOCAL_DATABASE_URL.",
    },
    { status: 503 }
  );
}
