import { createContext, type ReactNode } from "react";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
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
  clerkUserId?: string;
  migratedToClerk?: boolean;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser?: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();

  // Fetch Convex user data by Clerk ID
  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip"
  );

  const logout = async () => {
    // Clerk handles the sign out, just redirect to home
    window.location.href = "/";
  };

  const refreshUser = () => {
    // Convex queries are reactive, handled automatically
    console.log("User refresh requested (handled automatically by Clerk/Convex)");
  };

  // Calculate loading state: waiting for Clerk to load OR waiting for Convex data
  const isLoading = !clerkLoaded || (clerkUser && convexUser === undefined);

  return (
    <UserContext.Provider
      value={{
        user: convexUser || null,
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
