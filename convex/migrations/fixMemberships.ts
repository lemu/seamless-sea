import { mutation } from "../_generated/server";

// Migration to fix missing memberships
// All users should be members of the organization that has the fixtures
export const fixMissingMemberships = mutation({
  args: {},
  handler: async (ctx) => {
    // The organization with all the fixtures
    const organizationId = "jn74yz9z6a4dgqz6s1197cvxzs7p2g27" as any;

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Check existing memberships
    const existingMemberships = await ctx.db.query("memberships").collect();
    const userIdsWithMembership = new Set(existingMemberships.map(m => m.userId));

    // Add memberships for users without one
    let created = 0;
    for (const user of users) {
      if (!userIdsWithMembership.has(user._id)) {
        await ctx.db.insert("memberships", {
          userId: user._id,
          organizationId,
          role: "Admin", // Make everyone admin for now
          createdAt: Date.now(),
        });
        created++;
        console.log(`Created membership for ${user.email}`);
      }
    }

    return {
      success: true,
      message: `Created ${created} memberships`,
      total: users.length,
      existing: existingMemberships.length,
    };
  },
});
