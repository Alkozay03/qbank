// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Email from "next-auth/providers/email";
import { db } from "@/server/db";
import { setDevMagic } from "@/lib/dev-magic";

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
        host: process.env.EMAIL_SERVER_HOST, // smtp.gmail.com
        port,
        secure,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD, // Gmail App Password
        },
      },
  // Only override in DEV to capture the link; in prod we use the provider's default sender.
  ...(useDevNoSmtp && {
    async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
      console.warn(`[DEV EMAIL LOGIN] Magic link for ${identifier}: ${url}`);
      setDevMagic(identifier, url);
    },
  }),
} as any);

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(db),

  // 45-day session with JWT
  session: { strategy: "jwt", maxAge: 45 * 24 * 60 * 60 },

  providers: [emailProvider],
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, email }) {
      const addr = user?.email ?? email?.email;
      return isAllowedEmail(addr);
    },
    async session({ session, token, user }) {
      if (session.user) {
        (session.user as any).id = token?.sub ?? user?.id ?? null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
