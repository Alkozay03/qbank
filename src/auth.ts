// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { ClerkshipAdapter } from "@/lib/adapter";
import Email from "next-auth/providers/email";
import { setDevMagic } from "@/lib/dev-magic";
import { prisma } from "@/server/db";

// allow only u########@sharjah.ac.ae
function isAllowedEmail(email?: string | null) {
  if (!email) return false;
  return /^u\d{8}@sharjah\.ac\.ae$/i.test(email.trim());
}

const useDevNoSmtp = process.env.AUTH_DEV_NO_SMTP === "true";

// Port/secure handling so 465 and 587 both work
const port = Number(process.env.EMAIL_SERVER_PORT ?? 465);
const secure = port === 465;

const emailProvider = Email({
  from: process.env.EMAIL_FROM, // e.g. "Clerkship QBank <you@gmail.com>"
  server: useDevNoSmtp
    ? { jsonTransport: true } // DEV: don't send; log JSON to console
    : {
        host: process.env.EMAIL_SERVER_HOST, // e.g. "smtp.gmail.com"
        port,
        secure,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD, // e.g. Gmail App Password
        },
      },
  // DEV: capture the magic link instead of emailing
  ...(useDevNoSmtp && {
    async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
      console.warn(`[DEV EMAIL LOGIN] Magic link for ${identifier}: ${url}`);
      setDevMagic(identifier, url);
    },
  }),
});

const adapterInstance = ClerkshipAdapter();

// Force logging to work in production by using process.stderr directly
if (typeof process !== 'undefined' && process.stderr) {
  process.stderr.write(`🚀 [PROD AUTH.TS] Adapter created: ${typeof adapterInstance}\n`);
  process.stderr.write(`🚀 [PROD AUTH.TS] Has createVerificationToken: ${!!adapterInstance.createVerificationToken}\n`);
  process.stderr.write(`🚀 [PROD AUTH.TS] Has useVerificationToken: ${!!adapterInstance.useVerificationToken}\n`);
}

export const authOptions: NextAuthConfig = {
  adapter: adapterInstance,

  // 45-day session with JWT
  session: { strategy: "jwt", maxAge: 45 * 24 * 60 * 60 },

  providers: [emailProvider],
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  
  // Trust proxy for Vercel - critical for HTTPS cookie handling
  trustHost: true,
  
  // Ensure cookies work in production
  useSecureCookies: process.env.NODE_ENV === "production",

  callbacks: {
    /**
     * IMPORTANT:
     * - When requesting a magic link (account.provider === "email" and no user yet), ALLOW.
     * - When consuming the link (user exists), enforce allowed domain AND approval status.
     */
    async signIn({ user, account }) {
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔑 [SIGNIN] Called with user: ${user?.email}, provider: ${account?.provider}\n`);
      }
      
      // 1) Requesting the token (no user yet) -> allow so the token can be created/sent/logged
      if (account?.provider === "email" && !user) {
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`� [SIGNIN] Magic link request - allowing\n`);
        }
        return true;
      }

      // 2) Consuming the token (user resolved) -> enforce allowlist
      const addr = user?.email;
      const allowAny = process.env.AUTH_ALLOW_ANY_EMAIL === "true";
      const emailAllowed = allowAny || isAllowedEmail(addr);
      
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔑 [SIGNIN] Email ${addr}, allowed: ${emailAllowed}, allowAny: ${allowAny}\n`);
      }
      
      if (!emailAllowed) {
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`🔑 [SIGNIN] ❌ Email not in allowlist - BLOCKING\n`);
        }
        return false;
      }

      // 3) Check approval status
      if (user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { approvalStatus: true, role: true },
          });
          
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`� [SIGNIN] DB lookup: ${dbUser ? `Found - ${dbUser.approvalStatus}/${dbUser.role}` : 'NOT FOUND'}\n`);
          }
          
          // If user not found in DB, that's an error but let them through
          // (they'll be created by the adapter)
          if (!dbUser) {
            if (typeof process !== 'undefined' && process.stderr) {
              process.stderr.write(`🔑 [SIGNIN] ⚠️ User not in DB - allowing (will be created)\n`);
            }
            return true;
          }
          
          // BLOCKED users cannot sign in at all
          if (dbUser.approvalStatus === "BLOCKED") {
            if (typeof process !== 'undefined' && process.stderr) {
              process.stderr.write(`🔑 [SIGNIN] ❌ User is BLOCKED - denying\n`);
            }
            return false;
          }

          // PENDING and APPROVED users can sign in
          // (middleware will redirect PENDING users to /pending-approval)
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`🔑 [SIGNIN] ✅ Allowing sign in\n`);
          }
        } catch (error) {
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`🔑 [SIGNIN] ❌ DB ERROR: ${error}\n`);
          }
          // On DB error, allow signin (fail open for better UX)
          return true;
        }
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      // If user just logged in, check their approval status
      // and redirect PENDING users to pending-approval page
      if (url.startsWith(baseUrl)) {
        // Extract the email from the session if we can
        // This is tricky because we don't have session here yet
        // We'll need to handle this differently
        return url;
      }
      // Allows callback URLs on the same origin
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async session({ session, token }) {
      if (typeof process !== 'undefined' && process.stderr) {
        const tokenData = token as { sub?: string; email?: string; approvalStatus?: string; role?: string };
        process.stderr.write(`📋 [SESSION] Building session for token: ${token?.email}\n`);
        process.stderr.write(`📋 [SESSION] Token data: ${JSON.stringify({ sub: tokenData.sub, email: tokenData.email, approvalStatus: tokenData.approvalStatus, role: tokenData.role })}\n`);
      }
      
      if (session.user) {
        // add id without using `any`
        (session.user as { id?: string | null }).id = token?.sub ?? null;
        if (token?.email) session.user.email = token.email as string;
        
        // Add additional user data from token
        if (token?.firstName) {
          session.user.name = [token.firstName, token.lastName].filter(Boolean).join(' ') || null;
        }
      }
      
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`📋 [SESSION] Final session: ${JSON.stringify(session)}\n`);
      }
      
      return session;
    },

    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.email) token.email = user.email;
      
      // ALWAYS check approval status from database (not just on first login)
      // This ensures token is updated if admin changes user's status
      const email = user?.email || token?.email;
      if (email && typeof email === 'string') {
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`🎫 [JWT] Refreshing token for: ${email}\n`);
        }
        
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { approvalStatus: true, role: true, firstName: true, lastName: true },
        });
        
        if (dbUser) {
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`🎫 [JWT] DB User found: ${dbUser.approvalStatus}, ${dbUser.role}\n`);
          }
          (token as { approvalStatus?: string }).approvalStatus = dbUser.approvalStatus;
          (token as { role?: string }).role = dbUser.role;
          (token as { firstName?: string | null }).firstName = dbUser.firstName;
          (token as { lastName?: string | null }).lastName = dbUser.lastName;
        } else {
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`🎫 [JWT] WARNING: No DB user found for ${email}\n`);
          }
        }
      }
      
      return token;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
