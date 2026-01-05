import { mutation } from "../_generated/server";

// Migration to update all fixtures to use the new organization
export const updateFixturesToNewOrg = mutation({
  args: {},
  handler: async (ctx) => {
    // The old organization with all the fixtures
    const oldOrgId = "jn74yz9z6a4dgqz6s1197cvxzs7p2g27" as any;
    // The new organization we want to use
    const newOrgId = "jn7ccnv64at1jyxt0ytp6nwe457p2qrm" as any;

    // Update all fixtures
    const fixtures = await ctx.db
      .query("fixtures")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const fixture of fixtures) {
      await ctx.db.patch(fixture._id, {
        organizationId: newOrgId,
      });
    }

    // Update all orders
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("organizationId"), oldOrgId))
      .collect();

    for (const order of orders) {
      await ctx.db.patch(order._id, {
        organizationId: newOrgId,
      });
    }

    console.log(`Updated ${fixtures.length} fixtures and ${orders.length} orders`);

    return {
      success: true,
      message: `Updated ${fixtures.length} fixtures and ${orders.length} orders to new organization`,
      fixturesUpdated: fixtures.length,
      ordersUpdated: orders.length,
    };
  },
});
