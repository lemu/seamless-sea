import { createContext, type ReactNode } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authClient } from "../lib/auth-client";

// User type matching Better Auth user + our extensions
interface User {
  id: string; // Better Auth user ID
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  // Extensions from our users table
  avatarUrl?: string | null;
  appUserId?: Id<"users">; // Our app's user ID for backwards compatibility
  _id?: Id<"users">; // Alias for appUserId - backwards compatibility with existing code
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser?: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // Use Convex's auth state (more reliable than Better Auth's useSession for timing)
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();

  // Also get Better Auth session for user details (but don't use it for auth state)
  const { data: session } = authClient.useSession();

  // Get extended user data from our getCurrentUser query
  // Only run if Convex confirms we're authenticated
  const extendedUser = useQuery(
    api.authQueries.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const logout = async () => {
    try {
      await authClient.signOut();
      // Redirect to home after logout
      window.location.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
      // Still redirect even if there's an error
      window.location.replace("/");
    }
  };

  const refreshUser = () => {
    // Convex queries are reactive, handled automatically
    console.log("User refresh requested (handled automatically by Convex)");
  };

  // Prefer extendedUser from Convex query (validated), fallback to session data
  const user: User | null = extendedUser
    ? {
        id: extendedUser._id,
        name: extendedUser.name,
        email: extendedUser.email,
        emailVerified: extendedUser.emailVerified ?? false,
        image: extendedUser.image,
        createdAt: new Date(extendedUser.createdAt),
        updatedAt: extendedUser.updatedAt ? new Date(extendedUser.updatedAt) : undefined,
        // Extensions from our query
        avatarUrl: extendedUser.avatarUrl ?? null,
        appUserId: extendedUser.appUserId,
        _id: extendedUser.appUserId, // Alias for backwards compatibility
      }
    : session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          image: session.user.image,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt,
          avatarUrl: null,
          appUserId: undefined,
          _id: undefined,
        }
      : null;

  // Loading state: Convex auth is loading OR we're authenticated but extended data isn't loaded yet
  const isLoading = isConvexAuthLoading || (isAuthenticated && extendedUser === undefined);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
