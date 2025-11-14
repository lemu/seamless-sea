import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SITE_URL || "http://localhost:5173",
});

// Export commonly used auth methods for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
