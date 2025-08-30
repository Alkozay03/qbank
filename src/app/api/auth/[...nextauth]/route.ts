// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

// Expose NextAuth handlers at /api/auth/*
export const { GET, POST } = handlers;
