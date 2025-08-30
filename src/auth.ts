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

const emailProvider = Email({
  from: process.env.EMAIL_FROM, // In Gmail SMTP, set this to your Gmail or a verified alias
  server: useDevNoSmtp
    ? { jsonTransport: true } // DEV: no email sent; message is logged
    : {
        host: process.env.EMAIL_SERVER_HOST,      // smtp.gmail.com
        port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
        secure: true,
        auth: {
          user: process.env.EMAIL_SERVER_USER,    // your Gmail
          pass: process.env.EMAIL_SERVER_PASSWORD // Gmail App Password
        },
      },
});

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(db),

  // 45-day session
  session: { strategy: "jwt", maxAge: 45 * 24 * 60 * 60 },

  providers: [emailProvider],
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET,

  callbacks: {
    async signIn({ user, email }) {
      const addr = user?.email ?? email?.email;
      return isAllowedEmail(addr);
    },
  },

  events: {
    async sendVerificationRequest({ identifier, url }) {
      // Show the link in console AND store it for the /api/dev-magic route
      if (useDevNoSmtp) {
        console.log(`[DEV EMAIL LOGIN] Magic link for ${identifier}: ${url}`);
        setDevMagic(identifier, url);
      }
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
