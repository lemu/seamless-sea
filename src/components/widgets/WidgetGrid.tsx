import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { WidgetRenderer } from "./WidgetRenderer";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@rafal.lemieszewski/tide-ui";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Responsive breakpoints and column configuration
const breakpoints = { lg: 1200, md: 768, sm: 0 };
const cols = { lg: 4, md: 2, sm: 1 };

export interface WidgetGridProps {
  boardId: Id<"boards">;
  isEditable?: boolean;
  onAddWidget?: () => void;
  isAddingWidget?: boolean;
  onScrollComplete?: () => void;
}

export function WidgetGrid({ boardId, isEditable = true, onAddWidget, isAddingWidget = false, onScrollComplete }: WidgetGridProps) {
  // State for current breakpoint
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>("lg");

  // Ref to the grid container for scrolling
  const gridRef = useRef<HTMLDivElement>(null);

  // State for delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [widgetToDelete, setWidgetToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  // Calculate initial viewport-fitting rows
  const [maxRows, setMaxRows] = useState(() => {
    const availableHeight = window.innerHeight - 96; // 48px header + 48px padding
    const rowWithMargin = 256; // 240px row height + 16px margin
    const calculatedRows = Math.floor(availableHeight / rowWithMargin);
    const finalRows = Math.max(3, calculatedRows); // Minimum 3 rows

    return finalRows;
  });
  
  // Fetch widgets and layouts from Convex
  const widgets = useQuery(api.widgets.getWidgetsByBoard, { boardId });
  const layouts = useQuery(api.widgets.getBoardLayouts, { boardId });

  // Track widget count to detect new additions
  const [previousWidgetCount, setPreviousWidgetCount] = useState(0);
  const [lastAddedWidgetId, setLastAddedWidgetId] = useState<string | null>(null);
  
  // Mutations for updating layouts
  const updateBoardLayout = useMutation(api.widgets.updateBoardLayout);
  const deleteWidget = useMutation(api.widgets.deleteWidget);

  // Debounced layout save
  const [pendingLayouts, setPendingLayouts] = useState<Record<string, Layout[]> | null>(null);

  // Function to scroll to a grid position
  const scrollToPosition = useCallback((x: number, y: number) => {
    if (!gridRef.current) return;

    // Find the scrollable container (main content area)
    const findScrollableContainer = (element: HTMLElement): HTMLElement | null => {
      let current = element.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        if (style.overflow === 'auto' || style.overflowY === 'auto' ||
            current.classList.contains('overflow-auto')) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const scrollContainer = findScrollableContainer(gridRef.current);
    const rowHeight = 240;
    const margin = 16;
    const targetY = y * (rowHeight + margin);
    const scrollTop = Math.max(0, targetY - 100);

    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      // Fallback to window scroll if no container found
      window.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Debounce layout saves to avoid excessive API calls
  useEffect(() => {
    if (!pendingLayouts) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Save all breakpoint layouts
        for (const [breakpoint, layout] of Object.entries(pendingLayouts)) {
          await updateBoardLayout({
            boardId,
            breakpoint,
            layout: layout.map(item => ({
              i: item.i,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            })),
          });
        }
        setPendingLayouts(null);
      } catch (error) {
        console.error("Failed to save layout:", error);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [pendingLayouts, boardId, updateBoardLayout]);

  // Detect new widgets and scroll to them after creation (only when user is actively adding)
  useEffect(() => {
    if (!widgets || !layouts || !isAddingWidget) return;

    // Check if we have a new widget
    if (widgets.length > previousWidgetCount) {
      const newWidget = widgets[widgets.length - 1]; // Assuming newest widget is last
      setPreviousWidgetCount(widgets.length);

      // Find the position of the new widget in current breakpoint layout
      setTimeout(() => {
        const currentLayout = layouts[currentBreakpoint];

        if (currentLayout) {
          const widgetLayout = currentLayout.find(item => item.i === newWidget._id);

          if (widgetLayout) {
            // Ensure grid has enough rows for this widget
            const requiredRows = widgetLayout.y + 2; // Add buffer
            if (requiredRows > maxRows) {
              setMaxRows(Math.min(requiredRows, 20));

              // Wait for grid to expand before scrolling
              setTimeout(() => {
                scrollToPosition(widgetLayout.x, widgetLayout.y);
                onScrollComplete?.(); // Notify parent that scrolling is complete
              }, 200);
            } else {
              scrollToPosition(widgetLayout.x, widgetLayout.y);
              onScrollComplete?.(); // Notify parent that scrolling is complete
            }
          }
        }
      }, 500); // Wait for layout to be updated
    } else if (widgets.length < previousWidgetCount) {
      // Widget was deleted
      setPreviousWidgetCount(widgets.length);
    }
  }, [widgets, layouts, currentBreakpoint, previousWidgetCount, scrollToPosition, maxRows, isAddingWidget, onScrollComplete]);

  // Keep track of widget count changes even when not adding widgets
  useEffect(() => {
    if (!widgets) return;

    // Only update the count if we're not in adding mode (to avoid interfering with the scroll logic above)
    if (!isAddingWidget && widgets.length !== previousWidgetCount) {
      setPreviousWidgetCount(widgets.length);
    }
  }, [widgets, isAddingWidget, previousWidgetCount]);

  // Handle layout change
  const handleLayoutChange = useCallback((_layout: Layout[], allLayouts: Record<string, Layout[]>) => {
    if (!isEditable) return;

    // Check if any widget is in the last row and expand grid if needed
    if (_layout.length > 0) {
      const maxY = Math.max(..._layout.map(item => item.y + item.h - 1));
      const maxAllowedRows = 20; // Maximum 20 rows to prevent infinite growth
      if (maxY >= maxRows - 1 && maxRows < maxAllowedRows) {
        setMaxRows(prev => Math.min(prev + 1, maxAllowedRows)); // Add 1 row when needed, up to max
      }
    }

    setPendingLayouts(allLayouts);
  }, [isEditable, maxRows]);

  // Handle breakpoint change
  const handleBreakpointChange = useCallback((breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  }, []);

  // Handle widget deletion
  const handleDeleteWidget = useCallback((widgetId: string) => {
    if (!isEditable) return;
    setWidgetToDelete(widgetId);
    setShowDeleteDialog(true);
  }, [isEditable]);

  // Handle confirmed deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!widgetToDelete) return;

    setIsDeleting(true);
    try {
      await deleteWidget({ widgetId: widgetToDelete as Id<"widgets"> });
      setShowDeleteDialog(false);
      setWidgetToDelete(null);
    } catch (error) {
      console.error("Failed to delete widget:", error);
      alert("Failed to delete widget");
    } finally {
      setIsDeleting(false);
    }
  }, [widgetToDelete, deleteWidget]);

  // Smart layout generation that preserves existing widget positions
  const generateDefaultLayout = useCallback((widgets: any[]) => {
    const currentCols = cols[currentBreakpoint as keyof typeof cols];
    const existingLayouts = layouts?.[currentBreakpoint] || [];

    // Create a map of existing widget positions
    const existingPositions = new Map();
    existingLayouts.forEach(item => {
      existingPositions.set(item.i, item);
    });

    // Create a grid to track occupied spaces
    const occupiedGrid = new Set<string>();
    existingLayouts.forEach(item => {
      for (let x = item.x; x < item.x + item.w; x++) {
        for (let y = item.y; y < item.y + item.h; y++) {
          occupiedGrid.add(`${x},${y}`);
        }
      }
    });

    // Function to find next available position
    const findNextAvailablePosition = () => {
      for (let y = 0; y < maxRows; y++) {
        for (let x = 0; x < currentCols; x++) {
          if (!occupiedGrid.has(`${x},${y}`)) {
            occupiedGrid.add(`${x},${y}`);
            return { x, y };
          }
        }
      }
      // If no space available, return position that will trigger row expansion
      return { x: 0, y: maxRows };
    };

    return widgets.map((widget) => {
      // If widget already has a position, keep it
      if (existingPositions.has(widget._id)) {
        return existingPositions.get(widget._id);
      }

      // For new widgets, find the next available position
      const position = findNextAvailablePosition();
      return {
        i: widget._id,
        x: position.x,
        y: position.y,
        w: 1,
        h: 1,
        minW: 1,
        minH: 1,
      };
    });
  }, [currentBreakpoint, layouts, maxRows]);

  // Show loading state
  if (widgets === undefined || layouts === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-primary-subtle)] border-t-[var(--color-border-brand)]"></div>
          <p className="text-body-md text-[var(--color-text-secondary)]">Loading widgets...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no widgets
  if (!widgets || widgets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px] rounded-lg border-2 border-dashed border-[var(--color-border-primary-subtle)]">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[var(--color-background-neutral-subtle)] flex items-center justify-center">
            <svg
              className="h-6 w-6 text-[var(--color-text-tertiary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-heading-lg mb-2 text-[var(--color-text-primary)]">
            Add widgets
          </h3>
          <p className="text-body-md mb-4 text-[var(--color-text-secondary)]">
            This board is empty. Start building your dashboard by adding widgets
            like charts and tables.
          </p>
          {isEditable && onAddWidget && (
            <button
              onClick={onAddWidget}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-background-brand)] px-4 py-2 text-body-md font-medium text-[var(--color-text-brand-contrast)] hover:bg-[var(--color-background-brand-hovered)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-brand)] focus:ring-offset-2"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Widget
            </button>
          )}
        </div>
      </div>
    );
  }

  // Get current layouts or generate defaults
  const currentLayouts = (() => {
    if (!layouts || Object.keys(layouts).length === 0) {
      // No layouts exist - generate fresh layouts
      return {
        lg: generateDefaultLayout(widgets),
        md: generateDefaultLayout(widgets),
        sm: generateDefaultLayout(widgets),
      };
    }

    // Layouts exist - check if we need to add new widgets
    const updatedLayouts = { ...layouts };
    const breakpointsToUpdate = Object.keys(updatedLayouts);

    for (const breakpoint of breakpointsToUpdate) {
      const existingLayout = updatedLayouts[breakpoint] || [];
      const existingWidgetIds = new Set(existingLayout.map(item => item.i));
      const newWidgets = widgets.filter(widget => !existingWidgetIds.has(widget._id));

      if (newWidgets.length > 0) {
        // Create occupied grid for this breakpoint
        const currentCols = cols[breakpoint as keyof typeof cols];
        const occupiedGrid = new Set<string>();
        existingLayout.forEach(item => {
          for (let x = item.x; x < item.x + item.w; x++) {
            for (let y = item.y; y < item.y + item.h; y++) {
              occupiedGrid.add(`${x},${y}`);
            }
          }
        });

        // Find positions for new widgets
        const newLayoutItems = newWidgets.map(widget => {
          // Find next available position
          for (let y = 0; y < maxRows; y++) {
            for (let x = 0; x < currentCols; x++) {
              if (!occupiedGrid.has(`${x},${y}`)) {
                occupiedGrid.add(`${x},${y}`);
                return {
                  i: widget._id,
                  x,
                  y,
                  w: 1,
                  h: 1,
                  minW: 1,
                  minH: 1,
                };
              }
            }
          }
          // If no space available, add to bottom
          return {
            i: widget._id,
            x: 0,
            y: maxRows,
            w: 1,
            h: 1,
            minW: 1,
            minH: 1,
          };
        });

        updatedLayouts[breakpoint] = [...existingLayout, ...newLayoutItems];
      }
    }

    return updatedLayouts;
  })();


  return (
    <div className="w-full">
      {/* Responsive grid container */}
      <div className="relative" ref={gridRef}>
        <ResponsiveGridLayout
          className="layout"
          layouts={currentLayouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={240}
          width={1200}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={isEditable}
          isResizable={isEditable}
          draggableHandle=".widget-drag-handle"
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          // Free placement with widget pushing during resize
          compactType={null}
          preventCollision={false}
          allowOverlap={false}
          maxRows={maxRows}
        >
          {widgets.map((widget: any) => (
            <div key={widget._id} className="h-full w-full relative">
              <WidgetRenderer
                widget={widget}
                isEditable={isEditable}
                onDelete={() => handleDeleteWidget(widget._id)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Delete Widget Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Widget</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-body-md text-[var(--color-text-primary)]">
              Are you sure you want to remove this widget? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteDialog(false);
                setWidgetToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Remove Widget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}