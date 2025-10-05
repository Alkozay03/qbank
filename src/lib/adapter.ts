// src/lib/adapter.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Prisma } from "@prisma/client";

/**
 * Custom adapter wrapping PrismaAdapter to add email normalization
 * for verification tokens (case-insensitive email matching).
 */

export function ClerkshipAdapter(): Adapter {
  if (typeof process !== 'undefined' && process.stderr) {
    process.stderr.write(`🏗️ [PROD] ClerkshipAdapter initialized\n`);
  }
  const base = PrismaAdapter(prisma);
  if (typeof process !== 'undefined' && process.stderr) {
    process.stderr.write(`🏗️ [PROD] Base PrismaAdapter created\n`);
  }

  const adapter = {
    ...base,

    async createVerificationToken(data: { identifier: string; token: string; expires: Date }) {
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔐🔐🔐 [PROD] CUSTOM createVerificationToken CALLED!\n`);
        process.stderr.write(`🔐 [PROD] Original identifier: ${data.identifier}\n`);
      }
      
      // CRITICAL: Normalize identifier to lowercase when creating token
      const normalizedIdentifier = data.identifier.toLowerCase().trim();
      
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔐 [PROD] Normalized identifier: ${normalizedIdentifier}\n`);
        process.stderr.write(`🔐 [PROD] Token prefix: ${data.token.substring(0, 10)}...\n`);
        process.stderr.write(`🔐 [PROD] Expires: ${data.expires}\n`);
      }
      
      const token = await prisma.verificationToken.create({
        data: {
          identifier: normalizedIdentifier,
          token: data.token,
          expires: data.expires,
        },
      });
      
      const now = new Date();
      const minutesUntilExpiry = Math.round((data.expires.getTime() - now.getTime()) / 1000 / 60);
      
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`✅ [PROD] Token created successfully in database\n`);
        process.stderr.write(`✅ [PROD] Token valid for ${minutesUntilExpiry} minutes (until ${data.expires.toISOString()})\n`);
        process.stderr.write(`✅ [PROD] ⚠️ IMPORTANT: Token can only be used ONCE. Email scanners may consume it!\n`);
      }
      return token;
    },

    async useVerificationToken(params: { identifier: string; token: string }) {
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔍🔍🔍 [PROD] CUSTOM useVerificationToken CALLED!\n`);
        process.stderr.write(`🔍 [PROD] Original identifier: ${params.identifier}\n`);
        process.stderr.write(`🔍 [PROD] Token prefix: ${params.token.substring(0, 10)}...\n`);
      }
      
      // Normalize the identifier (email) to lowercase
      const normalizedIdentifier = params.identifier.toLowerCase().trim();
      
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔍 [PROD] Normalized identifier: ${normalizedIdentifier}\n`);
        process.stderr.write(`🔍 [PROD] Searching database...\n`);
      }
      
      try {
        // Try to find and delete the token in one operation
        const token = await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: normalizedIdentifier,
              token: params.token,
            },
          },
        });
        
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`✅ [PROD] Token found and deleted successfully!\n`);
        }
        return token;
      } catch (error) {
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`❌ [PROD] Token lookup FAILED\n`);
          process.stderr.write(`❌ [PROD] Error: ${error}\n`);
        }
        
        // Check what tokens exist for this identifier
        try {
          const existingTokens = await prisma.verificationToken.findMany({
            where: { identifier: { contains: params.identifier, mode: 'insensitive' } },
          });
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`❌ [PROD] Found ${existingTokens.length} similar token(s) in DB:\n`);
            existingTokens.forEach(t => {
              process.stderr.write(`   - identifier: "${t.identifier}", token prefix: ${t.token.substring(0, 10)}...\n`);
            });
          }
        } catch (searchError) {
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`❌ [PROD] Could not search for existing tokens: ${searchError}\n`);
          }
        }
        
        return null;
      }
    },

    async getUser(id: string) {
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
    async getUserByEmail(email: string) {
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
          approvalStatus: true,
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

    async createUser(data: { email: string; name?: string | null; image?: string | null; emailVerified?: Date | null }) {
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
          // approvalStatus defaults to PENDING from schema
        },
        select: { id: true, email: true, firstName: true, lastName: true, image: true, approvalStatus: true },
      });
      console.warn(`✅ Created new user: ${u.email} with status: ${u.approvalStatus}`);
      const name = [u.firstName ?? "", u.lastName ?? ""].join(" ").trim() || null;
      return { id: u.id, name, email: u.email, emailVerified: null, image: u.image ?? null } satisfies AdapterUser;
    },

    async updateUser(data: { id: string; email?: string; name?: string; image?: string }) {
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

    // NOTE: We removed createSession because we're using JWT strategy, not database sessions.
    // The rememberMe cookie logic isn't needed with JWT since maxAge is set in auth config.
  };
  
  console.error(`🏗️ [PROD] ClerkshipAdapter returning custom adapter with ${Object.keys(adapter).length} methods`);
  console.error(`🏗️ [PROD] Has createVerificationToken: ${!!adapter.createVerificationToken}`);
  console.error(`🏗️ [PROD] Has useVerificationToken: ${!!adapter.useVerificationToken}`);
  
  return adapter;
}
