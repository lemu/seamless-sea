import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Token expiry: 1 hour in milliseconds
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Create a password reset token (internal)
export const createResetToken = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Invalidate any existing tokens for this user
    const existingTokens = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of existingTokens) {
      if (!token.usedAt) {
        await ctx.db.patch(token._id, { usedAt: Date.now() });
      }
    }

    const token = generateToken();
    const now = Date.now();

    await ctx.db.insert("password_reset_tokens", {
      userId: args.userId,
      token,
      expiresAt: now + RESET_TOKEN_EXPIRY_MS,
      createdAt: now,
    });

    return token;
  },
});

// Request password reset (action that finds user, creates token, and sends email)
export const requestPasswordReset = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email,
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log("Password reset requested for unknown email:", args.email);
      return { success: true };
    }

    // Create reset token
    const token = await ctx.runMutation(api.passwordReset.createResetToken, {
      userId: user._id,
    });

    // Send password reset email
    await ctx.runAction(api.email.sendPasswordResetEmail, {
      toEmail: args.email,
      userName: user.name,
      resetToken: token,
    });

    return { success: true };
  },
});

// Verify reset token (check if valid and not expired)
export const verifyResetToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Verifying token:", args.token.substring(0, 16) + "...");

    const resetToken = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      console.log("Token not found in database");
      return { valid: false, error: "Invalid reset token" };
    }

    console.log("Token found:", {
      id: resetToken._id,
      usedAt: resetToken.usedAt,
      expiresAt: resetToken.expiresAt,
      createdAt: resetToken.createdAt,
    });

    if (resetToken.usedAt) {
      console.log("Token already used at:", new Date(resetToken.usedAt).toISOString());
      return { valid: false, error: "This reset link has already been used" };
    }

    if (Date.now() > resetToken.expiresAt) {
      console.log("Token expired at:", new Date(resetToken.expiresAt).toISOString());
      return { valid: false, error: "This reset link has expired" };
    }

    // Get user info for display
    const user = await ctx.db.get(resetToken.userId);
    console.log("Token valid for user:", user?.email);

    return {
      valid: true,
      email: user?.email,
    };
  },
});

// Mark token as used
export const markTokenUsed = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (resetToken && !resetToken.usedAt) {
      await ctx.db.patch(resetToken._id, { usedAt: Date.now() });
    }
  },
});

// Get user ID from token (for Better Auth password reset)
export const getUserIdFromToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      return null;
    }

    if (resetToken.usedAt || Date.now() > resetToken.expiresAt) {
      return null;
    }

    return resetToken.userId;
  },
});
