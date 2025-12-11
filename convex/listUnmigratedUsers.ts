import { query } from "./_generated/server";

// List all users without clerkUserId (unmigrated users)
export const listUnmigrated = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    const unmigrated = allUsers
      .filter(user => !user.clerkUserId)
      .map(user => ({
        email: user.email,
        name: user.name,
        hasAvatar: !!user.avatar,
        createdAt: new Date(user.createdAt).toISOString(),
      }));

    return {
      total: allUsers.length,
      migrated: allUsers.length - unmigrated.length,
      unmigrated: unmigrated.length,
      users: unmigrated,
    };
  },
});
