import { query } from "./_generated/server";
import { v } from "convex/values";

// Debug query to check user data
export const debugUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return { error: "User not found" };
    }

    // Get avatar URL if exists
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    } else if (user.clerkImageUrl) {
      avatarUrl = user.clerkImageUrl;
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      clerkUserId: user.clerkUserId || "NOT SET",
      avatar: user.avatar || "NOT SET",
      clerkImageUrl: user.clerkImageUrl || "NOT SET",
      avatarUrl: avatarUrl || "NOT SET",
      migratedToClerk: user.migratedToClerk || false,
    };
  },
});
