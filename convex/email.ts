"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Email from address - use Resend test domain for free tier
const FROM_EMAIL = "SeamlessSea <onboarding@resend.dev>";

// Send organization invitation email
export const sendInvitationEmail = action({
  args: {
    toEmail: v.string(),
    inviterName: v.string(),
    organizationName: v.string(),
    role: v.string(),
    inviteToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) {
      throw new Error("SITE_URL environment variable is not set");
    }

    const inviteLink = `${siteUrl}/invite/${args.inviteToken}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: args.toEmail,
      subject: `You've been invited to join ${args.organizationName} on SeamlessSea`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to SeamlessSea</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
                You've been invited!
              </h1>

              <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
                <strong>${args.inviterName}</strong> has invited you to join <strong>${args.organizationName}</strong> on SeamlessSea as a <strong>${args.role}</strong>.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
                SeamlessSea is a maritime trading platform that helps teams collaborate on freight planning, trade execution, and market intelligence.
              </p>

              <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                Accept Invitation
              </a>

              <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">

              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    console.log("Invitation email sent successfully:", data?.id);
    return { success: true, messageId: data?.id };
  },
});

// Send password reset email
export const sendPasswordResetEmail = action({
  args: {
    toEmail: v.string(),
    userName: v.string(),
    resetToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) {
      throw new Error("SITE_URL environment variable is not set");
    }

    const resetLink = `${siteUrl}/reset-password/${args.resetToken}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: args.toEmail,
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
                Hi ${args.userName},
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
                We received a request to reset your password for your SeamlessSea account. Click the button below to create a new password.
              </p>

              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                Reset Password
              </a>

              <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">

              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
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
    return { success: true, messageId: data?.id };
  },
});
