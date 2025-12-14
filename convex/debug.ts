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
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar || "NOT SET",
      avatarUrl: avatarUrl || "NOT SET",
      emailVerified: user.emailVerified || false,
      createdAt: user.createdAt || "NOT SET",
    };
  },
});

// Debug query to check database state for fixtures
export const checkFixtureData = query({
  args: {},
  handler: async (ctx) => {
    const activityLogs = await ctx.db.query("activity_logs").take(10);
    const contracts = await ctx.db.query("contracts").take(5);
    const negotiations = await ctx.db.query("negotiations").take(5);
    const fixtures = await ctx.db.query("fixtures").take(5);

    return {
      activityLogCount: activityLogs.length,
      activityLogs: activityLogs.map(log => ({
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        userId: log.userId,
        timestamp: log.timestamp,
      })),
      contractCount: contracts.length,
      contracts: contracts.map(c => ({
        _id: c._id,
        negotiationId: c.negotiationId,
      })),
      negotiationCount: negotiations.length,
      negotiations: negotiations.map(n => ({
        _id: n._id,
      })),
      fixtureCount: fixtures.length,
      fixtures: fixtures.map(f => ({
        _id: f._id,
        fixtureNumber: f.fixtureNumber,
        // Check if it references contract/negotiation
      })),
    };
  },
});
