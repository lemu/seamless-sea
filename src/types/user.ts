import type { Id } from '../../convex/_generated/dataModel';

// Better Auth user structure with our extensions
export interface User {
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

export interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser?: () => void;
}
