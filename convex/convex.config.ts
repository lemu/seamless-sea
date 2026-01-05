/**
 * Convex App Configuration
 *
 * Better Auth component registration for authentication.
 */

import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
