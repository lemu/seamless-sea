import { useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { HeaderActionsContext } from "../contexts/HeaderActionsContext";

/**
 * Hook to set header actions displayed in the AppFrame header.
 * Actions will automatically be cleared when the component unmounts.
 *
 * IMPORTANT: To prevent infinite re-render loops, always wrap the actions
 * in useMemo with appropriate dependencies.
 *
 * @param actions - React nodes to display in the header (buttons, switches, etc.)
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const [showPanel, setShowPanel] = useState(false);
 *
 *   const headerActions = useMemo(
 *     () => (
 *       <>
 *         <Button onClick={() => setShowPanel(!showPanel)}>
 *           Toggle Panel
 *         </Button>
 *         <Button variant="primary">Primary Action</Button>
 *       </>
 *     ),
 *     [showPanel]
 *   );
 *
 *   useHeaderActions(headerActions);
 *
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function useHeaderActions(actions: ReactNode | null): void {
  const context = useContext(HeaderActionsContext);

  if (context === undefined) {
    throw new Error(
      "useHeaderActions must be used within a HeaderActionsProvider"
    );
  }

  const { setActions } = context;

  useEffect(() => {
    setActions(actions);

    // Clean up actions when component unmounts
    return () => {
      setActions(null);
    };
  }, [actions, setActions]);
}
