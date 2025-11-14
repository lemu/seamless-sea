import { createContext, type ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionToken, clearSessionToken } from "../lib/auth-client";
import type { Id } from "../../convex/_generated/dataModel";

// Keep backward compatibility with existing User type
interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  createdAt: number;
  updatedAt?: number;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser?: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const token = getSessionToken();
  const signOutMutation = useMutation(api.auth.signOut);

  // Get current user from session token
  const user = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  const logout = async () => {
    if (token) {
      await signOutMutation({ token });
    }
    clearSessionToken();
    // Force page reload to clear state
    window.location.href = "/";
  };

  const refreshUser = () => {
    // Convex queries are reactive, so this is a no-op
    console.log("User refresh requested (handled automatically by Convex)");
  };

  return (
    <UserContext.Provider
      value={{
        user: user || null,
        isLoading: token ? user === undefined : false,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
