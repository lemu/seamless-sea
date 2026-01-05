import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled
authComponent.registerRoutes(http, createAuth as Parameters<typeof authComponent.registerRoutes>[1], { cors: true });

export default http;
