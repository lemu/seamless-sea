import { createContext, useState, type ReactNode } from "react";
import type { HeaderActionsContextType } from "../types/header";

/**
 * Context for managing header actions displayed in AppFrame
 */
export const HeaderActionsContext = createContext<
  HeaderActionsContextType | undefined
>(undefined);

/**
 * Provider component for header actions context
 */
export function HeaderActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [actions, setActions] = useState<ReactNode | null>(null);

  return (
    <HeaderActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}
