import type { Id } from '../../convex/_generated/dataModel';

export interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  avatar?: Id<"_storage">;
  avatarUrl?: string | null;
  createdAt: number;
  updatedAt?: number;
}

export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => void;
}