import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Mount Better-Auth routes at /api/auth/*
components.betterAuth.registerRoutes(http, auth);

// Add custom HTTP routes here if needed
// Example:
// http.route({
//   path: "/custom-endpoint",
//   method: "GET",
//   handler: async () => {
//     return new Response("Hello from custom endpoint", {
//       status: 200,
//     });
//   },
// });

export default http;
