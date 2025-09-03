export const runtime = "nodejs";

import { handlers } from "@/auth";
// NextAuth route handlers
export const { GET, POST } = handlers;
