import { createContext, type ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// User type matching bcrypt auth schema
interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser?: () => void;
  setAuthToken: (token: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const signOut = useMutation(api.auth.signOut);

  // Use state for token so it updates reactively
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem('session_token') : null
  );

  // Method to update token (called after login/signup)
  const setAuthToken = (newToken: string) => {
    localStorage.setItem('session_token', newToken);
    setToken(newToken);
  };

  // Listen for storage changes from logout
  useEffect(() => {
    const checkToken = () => {
      const currentToken = localStorage.getItem('session_token');
      if (currentToken !== token) {
        setToken(currentToken);
      }
    };

    // Check periodically in case token was removed
    const interval = setInterval(checkToken, 1000);
    return () => clearInterval(interval);
  }, [token]);

  // Get the current user using the session token
  const user = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  const logout = async () => {
    const token = localStorage.getItem('session_token');
    if (token) {
      try {
        await signOut({ token });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    localStorage.removeItem('session_token');
    // Use replace to avoid beforeunload warning
    window.location.replace("/");
  };

  const refreshUser = () => {
    // Convex queries are reactive, handled automatically
    console.log("User refresh requested (handled automatically by Convex)");
  };

  // User is loading if we have a token but no user data yet
  const isLoading = token !== null && user === undefined;

  return (
    <UserContext.Provider
      value={{
        user: user || null,
        isLoading,
        logout,
        refreshUser,
        setAuthToken,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
