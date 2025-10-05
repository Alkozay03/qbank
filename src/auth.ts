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
console.error(`🚀 [PROD AUTH.TS] Adapter created:`, typeof adapterInstance);
console.error(`🚀 [PROD AUTH.TS] Adapter has createVerificationToken:`, !!adapterInstance.createVerificationToken);
console.error(`🚀 [PROD AUTH.TS] Adapter has useVerificationToken:`, !!adapterInstance.useVerificationToken);

export const authOptions: NextAuthConfig = {
  adapter: adapterInstance,

  // 45-day session with JWT
  session: { strategy: "jwt", maxAge: 45 * 24 * 60 * 60 },

  providers: [emailProvider],
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  callbacks: {
    /**
     * IMPORTANT:
     * - When requesting a magic link (account.provider === "email" and no user yet), ALLOW.
     * - When consuming the link (user exists), enforce allowed domain AND approval status.
     */
    async signIn({ user, account }) {
      // 1) Requesting the token (no user yet) -> allow so the token can be created/sent/logged
      if (account?.provider === "email" && !user) {
        console.warn(`📧 Magic link requested for email provider`);
        return true;
      }

      // 2) Consuming the token (user resolved) -> enforce allowlist
      const addr = user?.email;
      const allowAny = process.env.AUTH_ALLOW_ANY_EMAIL === "true";
      const emailAllowed = allowAny || isAllowedEmail(addr);
      if (!emailAllowed) {
        console.warn(`❌ Email not allowed: ${addr}`);
        return false;
      }

      // 3) Check approval status
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { approvalStatus: true },
        });
        
        console.warn(`🔐 User ${user.email} signing in with status: ${dbUser?.approvalStatus}`);
        
        // BLOCKED users cannot sign in at all
        if (dbUser?.approvalStatus === "BLOCKED") {
          console.warn(`❌ BLOCKED user cannot sign in: ${user.email}`);
          return false;
        }

        // PENDING and APPROVED users can sign in
        // (middleware will redirect PENDING users to /pending-approval)
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
      if (session.user) {
        // add id without using `any`
        (session.user as { id?: string | null }).id = token?.sub ?? null;
        if (token?.email) session.user.email = token.email as string;
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.email) token.email = user.email;
      
      // Store approval status in the token so we can check it later
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { approvalStatus: true },
        });
        if (dbUser) {
          (token as { approvalStatus?: string }).approvalStatus = dbUser.approvalStatus;
        }
      }
      
      return token;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
