// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
export const runtime = "nodejs"; // ensure Node runtime for NextAuth v5
