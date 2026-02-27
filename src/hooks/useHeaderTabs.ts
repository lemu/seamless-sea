import { useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { HeaderActionsContext } from "../contexts/HeaderActionsContext";

/**
 * Hook to set header tabs displayed in the AppFrame header.
 * Tabs will automatically be cleared when the component unmounts.
 *
 * IMPORTANT: To prevent infinite re-render loops, always wrap the tabs
 * in useMemo with appropriate dependencies.
 *
 * @param tabs - React nodes to display as tabs in the header
 */
export function useHeaderTabs(tabs: ReactNode | null): void {
  const context = useContext(HeaderActionsContext);

  if (context === undefined) {
    throw new Error(
      "useHeaderTabs must be used within a HeaderActionsProvider"
    );
  }

  const { setTabs } = context;

  useEffect(() => {
    setTabs(tabs);

    return () => {
      setTabs(null);
    };
  }, [tabs, setTabs]);
}
