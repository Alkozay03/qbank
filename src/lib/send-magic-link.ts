// Utility to send magic link verification email
import { prisma } from "@/server/db";
import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

const useDevNoSmtp = process.env.AUTH_DEV_NO_SMTP === "true";

interface SendMagicLinkParams {
  email: string;
  callbackUrl?: string;
}

export async function sendMagicLinkEmail({ email, callbackUrl = "/years" }: SendMagicLinkParams) {
  try {
    // Generate verification token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Build magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const magicLinkUrl = `${baseUrl}/api/auth/callback/email?token=${token}&email=${encodeURIComponent(email)}`;

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Clerkship QBank</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Your account has been approved! 🎉</h2>
            
            <p style="font-size: 16px; color: #555;">
              Great news! An administrator has approved your Clerkship QBank account. 
              You can now access the platform.
            </p>
            
            <p style="font-size: 16px; color: #555;">
              Click the button below to sign in:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}" 
                 style="background-color: #667eea; 
                        color: #ffffff !important; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-size: 18px; 
                        font-weight: bold; 
                        display: inline-block;
                        border: none;">
                Sign in to Clerkship
              </a>
            </div>
            
            <p style="font-size: 14px; color: #777; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #999; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
              ${magicLinkUrl}
            </p>
            
            <p style="font-size: 14px; color: #777; margin-top: 30px;">
              This link will expire in 24 hours and can only be used once.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Your Clerkship QBank account has been approved!

Click the link below to sign in:
${magicLinkUrl}

This link will expire in 24 hours and can only be used once.

If you didn't request this, you can safely ignore this email.
    `;

    // Send email
    if (useDevNoSmtp) {
      // Development mode - just log the link
      console.warn(`[DEV EMAIL] Magic link for ${email}:`);
      console.warn(magicLinkUrl);
      return { success: true, dev: true, link: magicLinkUrl };
    } else {
      // Production mode - send via SMTP
      const port = Number(process.env.EMAIL_SERVER_PORT ?? 465);
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port,
        secure,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Clerkship QBank <noreply@clerkship.me>",
        to: email,
        subject: "Your Clerkship QBank account has been approved! 🎉",
        text: emailText,
        html: emailHtml,
      });

      console.warn(`✅ Approval email sent to ${email}`);
      return { success: true };
    }
  } catch (error) {
    console.error("Error sending magic link email:", error);
    throw error;
  }
}
