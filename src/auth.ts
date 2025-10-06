// src/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { ClerkshipAdapter } from "@/lib/adapter";
import Email from "next-auth/providers/email";
import { setDevMagic } from "@/lib/dev-magic";
import { prisma } from "@/server/db";
import nodemailer from "nodemailer";

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
  maxAge: 24 * 60 * 60, // Token valid for 24 hours (in seconds)
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
  // Custom email template for Outlook compatibility
  async sendVerificationRequest({ identifier, url, provider }: { identifier: string; url: string; provider: { from?: string; server?: object } }) {
    // DEV mode: log instead of sending
    if (useDevNoSmtp) {
      console.warn(`[DEV EMAIL LOGIN] Magic link for ${identifier}: ${url}`);
      setDevMagic(identifier, url);
      return;
    }

    const { host } = new URL(url);
    const escapedHost = host.replace(/\./g, "&#8203;.");
    
    // Outlook-compatible HTML email template
    const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sign in to Clerkship QBank</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; color: #2F6F8F; font-size: 28px; font-weight: 600;">Clerkship QBank</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Click the button below to sign in to your account at <strong>${escapedHost}</strong>:
              </p>
              
              <!-- Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #2F6F8F; border-radius: 6px;">
                          <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                            Sign In to QBank
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; word-break: break-all;">
                <a href="${url}" style="color: #2F6F8F; text-decoration: underline; font-size: 14px;">${url}</a>
              </p>
              
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>Important:</strong> This link will expire in 24 hours and can only be used once.
              </p>
              
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6;">
                If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} Clerkship QBank. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // Plain text version for clients that don't support HTML
    const text = `Sign in to Clerkship QBank\n\nClick the link below to sign in:\n${url}\n\nThis link will expire in 24 hours and can only be used once.\n\nIf you did not request this email, you can safely ignore it.`;

    // Use nodemailer directly for better control
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port,
      secure,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    await transport.sendMail({
      from: provider.from,
      to: identifier,
      subject: `Sign in to Clerkship QBank`,
      text,
      html,
      // Outlook-specific headers
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Clerkship QBank',
      },
    });
  },
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
  pages: { 
    signIn: "/login",
    error: "/auth/error", // Custom error page
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  
  // Trust proxy for Vercel - critical for HTTPS cookie handling
  trustHost: true,
  
  // Ensure cookies work in production
  useSecureCookies: process.env.NODE_ENV === "production",
  
  // Simplified cookie configuration - let NextAuth handle defaults
  // The issue was explicitly setting domain which can cause cookie problems
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Don't set domain - let it default to current domain
      },
    },
  },

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
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔀 [REDIRECT] url: ${url}, baseUrl: ${baseUrl}\n`);
      }
      
      // Allow same-origin URLs (including error pages)
      if (url.startsWith("/")) {
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`🔀 [REDIRECT] Allowing relative URL: ${url}\n`);
        }
        return `${baseUrl}${url}`;
      }
      
      // Allow full URLs on same origin
      if (url.startsWith(baseUrl)) {
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`🔀 [REDIRECT] Allowing same-origin URL: ${url}\n`);
        }
        return url;
      }
      
      // Default: redirect to /years after successful login
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`🔀 [REDIRECT] Defaulting to /years\n`);
      }
      return `${baseUrl}/years`;
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

    async jwt({ token, user, trigger }) {
      // Only fetch from database on initial sign-in or when explicitly triggered
      // This prevents unnecessary DB hits on every request
      if (user) {
        // Fresh sign-in: populate token with user ID and email
        if (user.id) token.sub = user.id;
        if (user.email) token.email = user.email;
        
        if (typeof process !== 'undefined' && process.stderr) {
          process.stderr.write(`🎫 [JWT] Initial login for: ${user.email}\n`);
        }
        
        // Fetch additional user data from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { approvalStatus: true, role: true, firstName: true, lastName: true },
        });
        
        if (dbUser) {
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`🎫 [JWT] User data: ${dbUser.approvalStatus}, ${dbUser.role}, ${dbUser.firstName} ${dbUser.lastName}\n`);
          }
          (token as { approvalStatus?: string }).approvalStatus = dbUser.approvalStatus;
          (token as { role?: string }).role = dbUser.role;
          (token as { firstName?: string | null }).firstName = dbUser.firstName;
          (token as { lastName?: string | null }).lastName = dbUser.lastName;
        }
      } else if (trigger === 'update') {
        // Token update requested (e.g., after profile change)
        // Re-fetch user data from database
        const email = token?.email as string | undefined;
        if (email) {
          if (typeof process !== 'undefined' && process.stderr) {
            process.stderr.write(`🎫 [JWT] Refreshing token data for: ${email}\n`);
          }
          
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { approvalStatus: true, role: true, firstName: true, lastName: true },
          });
          
          if (dbUser) {
            (token as { approvalStatus?: string }).approvalStatus = dbUser.approvalStatus;
            (token as { role?: string }).role = dbUser.role;
            (token as { firstName?: string | null }).firstName = dbUser.firstName;
            (token as { lastName?: string | null }).lastName = dbUser.lastName;
          }
        }
      }
      // Otherwise: just return existing token (no DB hit)
      
      return token;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
