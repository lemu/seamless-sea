import { mutation } from "./_generated/server";

// Quick fix: Update all fixtures and orders to use the new organization
export const updateToNewOrg = mutation({
  args: {},
  handler: async (ctx) => {
    const oldOrgId = "jn74yz9z6a4dgqz6s1197cvxzs7p2g27" as any;
    const newOrgId = "jn7ccnv64at1jyxt0ytp6nwe457p2qrm" as any;

    // Update fixtures
    const fixtures = await ctx.db
      .query("fixtures")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const fixture of fixtures) {
      await ctx.db.patch(fixture._id, { organizationId: newOrgId });
    }

    // Update orders
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const order of orders) {
      await ctx.db.patch(order._id, { organizationId: newOrgId });
    }

    return {
      success: true,
      fixturesUpdated: fixtures.length,
      ordersUpdated: orders.length,
    };
  },
});
