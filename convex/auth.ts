import { betterAuth } from "better-auth";
import { convexAdapter } from "@convex-dev/better-auth";
import { components } from "./_generated/api";

export const auth = betterAuth({
  database: convexAdapter(components.betterAuth),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false, // Start with false, can enable later

    // Email sending functions - using console.log for now
    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    sendVerificationEmail: async (user, url, token) => {
      console.log(`
========================================
EMAIL VERIFICATION
========================================
To: ${user.email}
Name: ${user.name}
Verification URL: ${url}
Token: ${token}
========================================
      `);
      // In production, use:
      // await sendEmail({
      //   to: user.email,
      //   subject: "Verify your email",
      //   html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      // });
    },

    sendResetPassword: async (user, url, token) => {
      console.log(`
========================================
PASSWORD RESET
========================================
To: ${user.email}
Name: ${user.name}
Reset URL: ${url}
Token: ${token}
========================================
      `);
      // In production, use:
      // await sendEmail({
      //   to: user.email,
      //   subject: "Reset your password",
      //   html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      // });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  rateLimit: {
    enabled: true,
    window: 10, // 10 seconds
    max: 100, // Max 100 requests per window
    storage: "database", // Persist rate limit data
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 5, // Stricter for login attempts
      },
      "/sign-up/email": {
        window: 60,
        max: 3, // Stricter for signup
      },
      "/forget-password": {
        window: 60,
        max: 3, // Stricter for password reset requests
      },
    },
  },

  // Advanced options
  advanced: {
    cookiePrefix: "seamless-sea",
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
