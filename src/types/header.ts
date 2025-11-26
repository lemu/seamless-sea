import type { ReactNode } from "react";

/**
 * Context type for managing header actions displayed in AppFrame
 */
export interface HeaderActionsContextType {
  /**
   * Current header actions to display
   */
  actions: ReactNode | null;

  /**
   * Set the header actions to display
   */
  setActions: (actions: ReactNode | null) => void;
}
