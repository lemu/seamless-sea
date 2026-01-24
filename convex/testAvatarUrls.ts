import { query } from "./_generated/server";

/**
 * Test query to check avatar URL generation for specific companies
 * This helps debug why some avatars generate URLs while others don't
 */
export const testAvatarUrls = query({
  args: {},
  handler: async (ctx) => {
    const testCompanies = [
      "Louis Dreyfus",  // Reported as failing
      "Evergreen",      // Reported as failing
      "Cargill",        // Reported as failing
      "Cofco",          // Reported as failing
      "MB Shipbrokers", // Reported as failing
      "CMB Tech",       // Reported as working
      "BRS",            // Reported as working
    ];

    const results = [];

    for (const name of testCompanies) {
      const company = await ctx.db
        .query("companies")
        .filter((q) => q.eq(q.field("name"), name))
        .first();

      if (!company) {
        results.push({
          name,
          found: false,
          hasAvatar: false,
          avatarId: null,
          avatarUrl: null,
        });
        continue;
      }

      let avatarUrl = null;
      if (company.avatar) {
        try {
          avatarUrl = await ctx.storage.getUrl(company.avatar);
        } catch (error) {
          avatarUrl = `ERROR: ${error}`;
        }
      }

      results.push({
        name: company.name,
        found: true,
        hasAvatar: !!company.avatar,
        avatarId: company.avatar || null,
        avatarUrl,
        urlIsNull: avatarUrl === null,
      });
    }

    return results;
  },
});
