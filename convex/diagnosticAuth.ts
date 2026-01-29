import { query } from "./_generated/server";

export const checkAuthEnvironment = query({
  args: {},
  handler: async (_ctx) => {
    return {
      hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      hasSiteUrl: !!process.env.SITE_URL,
      secretLength: process.env.BETTER_AUTH_SECRET?.length || 0,
      siteUrl: process.env.SITE_URL,
    };
  },
});
