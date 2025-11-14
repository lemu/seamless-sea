import { createContext, type ReactNode } from "react";
import { useSession, signOut } from "../lib/auth-client";
import type { Id } from "../../convex/_generated/dataModel";

// Keep backward compatibility with existing User type
interface User {
  _id: Id<"users">;
  id: string;
  name: string;
  email: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
  image?: string | null;
  emailVerified: boolean;
  createdAt: number;
  updatedAt: Date;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  refreshUser?: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = useSession();

  // Transform session.user to match existing User interface for backward compatibility
  const user: User | null = session?.user
    ? {
        _id: session.user.id as Id<"users">, // Cast Better-Auth ID to Convex ID type
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? undefined,
        avatarUrl: session.user.image,
        emailVerified: session.user.emailVerified,
        createdAt: new Date(session.user.createdAt).getTime(),
        updatedAt: session.user.updatedAt,
      }
    : null;

  const logout = async () => {
    await signOut();
  };

  const refreshUser = () => {
    // With Better-Auth, sessions are automatically refreshed
    // This is a no-op for compatibility
    console.log("User refresh requested (handled automatically by Better-Auth)");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: isPending,
        error: error || null,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
