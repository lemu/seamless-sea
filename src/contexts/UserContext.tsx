import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
  createdAt: number;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("userEmail");
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginPromiseResolvers, setLoginPromiseResolvers] = useState<{
    resolve: (value: boolean) => void;
    email: string;
  } | null>(null);

  // Single query for current email
  const userData = useQuery(
    api.users.getUserByEmail,
    currentEmail ? { email: currentEmail } : "skip",
  );

  // Handle query results
  useEffect(() => {
    console.log("userData changed:", userData, "currentEmail:", currentEmail);

    if (userData && currentEmail) {
      // Set the user in context (this should update the avatar too)
      console.log("Updating user with new data:", userData);
      setUser(userData);
      setIsLoading(false);

      // Save to localStorage for persistence
      localStorage.setItem("userEmail", currentEmail);

      // Resolve any pending login promise
      if (
        loginPromiseResolvers &&
        loginPromiseResolvers.email === currentEmail
      ) {
        console.log("Login successful! Resolving promise");
        loginPromiseResolvers.resolve(true);
        setLoginPromiseResolvers(null);
      }
    } else if (userData === null && currentEmail) {
      // Query completed but no user found
      setIsLoading(false);
      if (
        loginPromiseResolvers &&
        loginPromiseResolvers.email === currentEmail
      ) {
        console.log("Login failed! User not found");
        loginPromiseResolvers.resolve(false);
        setLoginPromiseResolvers(null);
        setCurrentEmail(null); // Clear failed query
      }
    }
  }, [userData, currentEmail, loginPromiseResolvers]);

  const login = async (email: string): Promise<boolean> => {
    console.log("Login attempt for email:", email);
    setIsLoading(true);

    return new Promise((resolve) => {
      // Store the promise resolver
      setLoginPromiseResolvers({ resolve, email });

      // Set the email to trigger the query
      setCurrentEmail(email);

      // Set a timeout as backup
      setTimeout(() => {
        if (loginPromiseResolvers && loginPromiseResolvers.email === email) {
          console.log("Login timeout - resolving as false");
          resolve(false);
          setLoginPromiseResolvers(null);
          setIsLoading(false);
          setCurrentEmail(null);
        }
      }, 5000);
    });
  };

  const logout = () => {
    setUser(null);
    setCurrentEmail(null);
    setIsLoading(false);
    localStorage.removeItem("userEmail");
  };

  const refreshUser = () => {
    if (currentEmail) {
      console.log("Manually refreshing user data for:", currentEmail);
      // Force re-trigger the query by clearing and setting email
      const email = currentEmail;
      setCurrentEmail(null);
      setTimeout(() => {
        setCurrentEmail(email);
      }, 100);
    }
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, login, logout, isLoading, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
