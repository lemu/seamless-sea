import { mutation } from "./_generated/server";
import { components } from "./_generated/api";

/**
 * List all JWKS records via Better Auth component adapter.
 *
 * Run with: npx convex run cleanupJwks:listJwks
 */
export const listJwks = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const jwksRecords = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "jwks",
          paginationOpts: {
            cursor: null,
            numItems: 100,
          },
        }
      );

      return {
        count: jwksRecords.page.length,
        records: jwksRecords.page.map((jwks: any) => ({
          id: jwks._id,
          createdAt: jwks.createdAt
            ? new Date(jwks.createdAt).toISOString()
            : "Unknown",
          hasPublicKey: !!jwks.publicKey,
          hasPrivateKey: !!jwks.privateKey,
        })),
      };
    } catch (error) {
      console.error("Error listing JWKS:", error);
      return {
        count: 0,
        records: [],
        error: String(error),
      };
    }
  },
});

/**
 * Delete all JWKS records via Better Auth component adapter.
 * This forces Better Auth to regenerate keys with the current BETTER_AUTH_SECRET.
 *
 * Run with: npx convex run cleanupJwks:deleteAllJwks
 */
export const deleteAllJwks = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // First, list all JWKS to get count
      const jwksRecords = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "jwks",
          paginationOpts: {
            cursor: null,
            numItems: 100,
          },
        }
      );

      const count = jwksRecords.page.length;
      console.log(`Found ${count} JWKS record(s)`);

      if (count === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: "No JWKS records found to delete.",
        };
      }

      // Delete all JWKS records (no where clause = delete all)
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "jwks" as const,
        },
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
      } as any);

      console.log(`Deleted ${count} JWKS record(s)`);

      return {
        success: true,
        deletedCount: count,
        message: `Deleted ${count} JWKS record(s). Better Auth will generate new keys on next request.`,
      };
    } catch (error) {
      console.error("Error deleting JWKS:", error);
      return {
        success: false,
        deletedCount: 0,
        error: String(error),
        message: "Failed to delete JWKS records. See console for details.",
      };
    }
  },
});
