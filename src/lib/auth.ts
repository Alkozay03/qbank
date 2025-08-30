// src/lib/auth.ts
// Simple shim so old imports keep working with NextAuth v5.
// Avoids pulling Node-only modules into edge/middleware.
export { auth, signIn, signOut } from "@/auth";
