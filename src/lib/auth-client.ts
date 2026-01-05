import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

const isDev = import.meta.env.DEV;

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [
    // crossDomainClient handles session storage for cross-domain scenarios
    crossDomainClient({
      cookieAttributes: {
        sameSite: "none",
        secure: !isDev, // false for localhost (http), true for production (https)
      },
    }),
    convexClient(),
  ],
});
