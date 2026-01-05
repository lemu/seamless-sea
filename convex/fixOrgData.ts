import { mutation } from "./_generated/server";

// Migrate all data from Sea organization to Acme organization
export const updateToNewOrg = mutation({
  args: {},
  handler: async (ctx) => {
    const seaOrgId = "jn7ccnv64at1jyxt0ytp6nwe457p2qrm" as any; // Sea (old)
    const acmeOrgId = "jn74yz9z6a4dgqz6s1197cvxzs7p2g27" as any; // Acme (new)

    // Update fixtures
    const fixtures = await ctx.db
      .query("fixtures")
      .filter((q) => q.eq(q.field("organizationId"), seaOrgId))
      .collect();

    for (const fixture of fixtures) {
      await ctx.db.patch(fixture._id, { organizationId: acmeOrgId });
    }

    // Update orders
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("organizationId"), seaOrgId))
      .collect();

    for (const order of orders) {
      await ctx.db.patch(order._id, { organizationId: acmeOrgId });
    }

    // Update boards
    const boards = await ctx.db
      .query("boards")
      .filter((q) => q.eq(q.field("organizationId"), seaOrgId))
      .collect();

    for (const board of boards) {
      await ctx.db.patch(board._id, { organizationId: acmeOrgId });
    }

    // Update pinned_boards
    const pinnedBoards = await ctx.db
      .query("pinned_boards")
      .filter((q) => q.eq(q.field("organizationId"), seaOrgId))
      .collect();

    for (const pinnedBoard of pinnedBoards) {
      await ctx.db.patch(pinnedBoard._id, { organizationId: acmeOrgId });
    }

    return {
      success: true,
      fixturesUpdated: fixtures.length,
      ordersUpdated: orders.length,
      boardsUpdated: boards.length,
      pinnedBoardsUpdated: pinnedBoards.length,
    };
  },
});
