/**
 * Auth Configuration for Convex
 *
 * This file configures how Convex validates JWT tokens from Better Auth.
 * See: https://docs.convex.dev/auth
 */
export default {
  providers: [
    {
      // The domain that issues JWT tokens (your Convex site URL)
      domain: process.env.CONVEX_SITE_URL,
      // The application ID used in the JWT "aud" claim
      applicationID: "convex",
    },
  ],
};
