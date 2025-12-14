import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

/**
 * Generate a secure random session token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign up a new user with email and password
 */
export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate password length
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Hash the password
    const passwordHash = bcrypt.hashSync(args.password, 10);

    // Create user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash,
      emailVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    // Return user and session
    const user = await ctx.db.get(userId);
    return {
      user,
      session: { token, expiresAt },
    };
  },
});

/**
 * Sign in an existing user with email and password
 */
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = bcrypt.compareSync(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      user,
      session: { token, expiresAt },
    };
  },
});

/**
 * Sign out a user by deleting their session
 */
export const signOut = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * Get current user from session token
 */
export const getCurrentUser = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) {
      return null;
    }

    // Store token in const to satisfy TypeScript
    const token = args.token;

    // Find session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    // Check if session exists and is not expired
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // Get avatar URL if exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    }

    return {
      ...user,
      avatarUrl,
    };
  },
});

/**
 * Change password for authenticated user
 */
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user || !user.passwordHash) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = bcrypt.compareSync(args.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Hash new password
    const passwordHash = bcrypt.hashSync(args.newPassword, 10);

    // Update user
    await ctx.db.patch(user._id, {
      passwordHash,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Cleanup expired sessions (maintenance function)
 */
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});
