import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

// Generate a random session token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Sign up a new user
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
    const passwordHash = await bcrypt.hash(args.password, 10);

    // Create the user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash,
      emailVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create a session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    // Return the user and session
    const user = await ctx.db.get(userId);
    return {
      user,
      session: { token, expiresAt },
    };
  },
});

// Sign in an existing user
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has a password (for migration from old system)
    if (!user.passwordHash) {
      throw new Error("Please set up your password first");
    }

    // Verify the password
    const isValid = await bcrypt.compare(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Create a new session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    // Return the user and session
    return {
      user,
      session: { token, expiresAt },
    };
  },
});

// Sign out (invalidate session)
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

    return { success: true };
  },
});

// Get current user from session token
export const getCurrentUser = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) {
      return null;
    }

    const token = args.token; // Capture token in a const for TypeScript

    // Find the session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      // Session expired - return null
      // Note: Expired sessions are cleaned up by the cleanupExpiredSessions mutation
      return null;
    }

    // Get the user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // Get avatar URL if avatar exists
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

// Clean up expired sessions (can be called periodically)
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

// Check if a user exists and whether they have a password
export const checkUserExists = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { exists: false, hasPassword: false };
    }

    return {
      exists: true,
      hasPassword: !!user.passwordHash,
      name: user.name,
    };
  },
});

// Set password for existing user without password (migration)
export const setPasswordForExistingUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a password
    if (user.passwordHash) {
      throw new Error("User already has a password set. Please use sign in.");
    }

    // Validate password length
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(args.password, 10);

    // Update the user with the password
    await ctx.db.patch(user._id, {
      passwordHash,
      emailVerified: true, // Mark as verified since they had access
      updatedAt: Date.now(),
    });

    // Create a session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    // Return the updated user and session
    const updatedUser = await ctx.db.get(user._id);
    return {
      user: updatedUser,
      session: { token, expiresAt },
    };
  },
});
