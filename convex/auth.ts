"use node";

import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { betterAuth } from "better-auth";
import { Resend } from "resend";

const siteUrl = process.env.SITE_URL!;
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "SeamlessSea <onboarding@resend.dev>";

// Better Auth component - uses the registered component from convex.config.ts
export const authComponent = createClient<DataModel>(components.betterAuth);

// Create Better Auth instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true, // Automatically sign in after signup
      sendVerificationEmail: async () => {
        // Email verification disabled - do nothing
        return;
      },
      sendResetPassword: async ({ user, url }) => {
        console.log("Sending password reset email to:", user.email, "URL:", url);
        try {
          const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: "Reset your SeamlessSea password",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
                      Reset Your Password
                    </h1>

                    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
                      Hi ${user.name || "there"},
                    </p>

                    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
                      We received a request to reset your password for your SeamlessSea account. Click the button below to create a new password.
                    </p>

                    <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Reset Password
                    </a>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>

                    <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">

                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      If the button above doesn't work, copy and paste this link into your browser:<br>
                      <a href="${url}" style="color: #2563eb;">${url}</a>
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          if (error) {
            console.error("Failed to send password reset email:", error);
            throw new Error(`Failed to send password reset email: ${error.message}`);
          }

          console.log("Password reset email sent successfully:", data?.id);
        } catch (err) {
          console.error("Error sending password reset email:", err);
          throw err;
        }
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex(),
    ],
  });
};
