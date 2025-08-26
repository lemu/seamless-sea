import { useContext } from 'react';
import type { UserContextType } from '../types/user';
import { UserContext } from '../contexts/context';

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}