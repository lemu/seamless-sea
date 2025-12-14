/**
 * Convex App Configuration
 *
 * Convex Auth doesn't require a separate app configuration.
 * The auth tables are imported directly in schema.ts.
 */

import { defineApp } from "convex/server";

const app = defineApp();

export default app;
