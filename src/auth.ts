// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { ClerkshipAdapter } from "@/lib/adapter";
import Email from "next-auth/providers/email";
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

export const authOptions: NextAuthConfig = {
  adapter: ClerkshipAdapter(),

  // 45-day session with JWT
  session: { strategy: "jwt", maxAge: 45 * 24 * 60 * 60 },

  providers: [emailProvider],
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  callbacks: {
    /**
     * IMPORTANT:
     * - When requesting a magic link (account.provider === "email" and no user yet), ALLOW.
     * - When consuming the link (user exists), enforce allowed domain.
     */
    async signIn({ user, account }) {
      // 1) Requesting the token (no user yet) -> allow so the token can be created/sent/logged
      if (account?.provider === "email" && !user) return true;

      // 2) Consuming the token (user resolved) -> enforce allowlist
      const addr = user?.email;
      const allowAny = process.env.AUTH_ALLOW_ANY_EMAIL === "true";
      return allowAny || isAllowedEmail(addr);
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
      return token;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
