/**
 * Clerk Authentication Configuration for Convex
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Clerk account at https://clerk.com
 * 2. Create a new application
 * 3. Go to JWT Templates → Create template → Select "Convex"
 * 4. Copy the "Issuer" URL from the JWT template (e.g., https://your-app.clerk.accounts.dev)
 * 5. Replace "YOUR_CLERK_ISSUER_URL" below with your actual Issuer URL
 * 6. Ensure JWT template is named exactly "convex"
 */

export default {
  providers: [
    {
      // Replace with your Clerk Issuer URL from JWT template
      domain:
        process.env.CLERK_ISSUER_URL ||
        "https://fluent-mustang-27.clerk.accounts.dev",
      applicationID: "convex", // Must match JWT template name in Clerk
    },
  ],
};
