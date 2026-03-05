import { useState, useEffect, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { WidgetRenderer } from "./WidgetRenderer";
import { EmptyState } from "../EmptyState";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@rafal.lemieszewski/tide-ui";
import type { WidgetDocument, WidgetSize } from "../../types/widgets";
import { getSizeFromRows, getWidgetSizeConfigs } from "../../types/widgets";
import { getChartById } from "../../data/chartRegistry";

// Layout item type for grid
interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isResizable?: boolean;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

// Responsive breakpoints and column configuration
const breakpoints = { lg: 1200, md: 768, sm: 0 };
const cols = { lg: 4, md: 2, sm: 1 };

// Apply size constraints to a layout item based on its row height
function withSizeConstraints(item: LayoutItem, breakpoint: string, widgetType?: string, chartType?: string): LayoutItem {
  const base = { ...item, isResizable: false };
  const size = getSizeFromRows(item.h);
  if (!size) return base; // unknown h — keep as-is
  const configs = getWidgetSizeConfigs(chartType, widgetType);
  const cfg = configs[size];
  if (!cfg) return base;
  const exactBpW = cfg.breakpointDefaultW?.[breakpoint];
  // If an explicit per-breakpoint width is defined, use it exactly.
  // Otherwise clamp item.w to [defaultW, maxW] to preserve user's sizing choice.
  const w = exactBpW !== undefined
    ? exactBpW
    : Math.min(Math.max(item.w, cfg.defaultW), cfg.maxW);
  return { ...base, w, minW: cfg.minW, maxW: cfg.maxW, minH: cfg.h, maxH: cfg.h };
}

export interface WidgetGridProps {
  boardId: Id<"boards">;
  isEditable?: boolean;
  onAddWidget?: () => void;
  isAddingWidget?: boolean;
  onScrollComplete?: () => void;
}

export function WidgetGrid({
  boardId,
  isEditable = true,
  onAddWidget,
  isAddingWidget = false,
  onScrollComplete,
}: WidgetGridProps) {
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

  // Mutations for updating layouts
  const updateBoardLayout = useMutation(api.widgets.updateBoardLayout);
  const deleteWidget = useMutation(api.widgets.deleteWidget);

  // Debounced layout save
  const [pendingLayouts, setPendingLayouts] = useState<Record<
    string,
    Layout[]
  > | null>(null);

  // Local layout overrides (applied by size picker, before next Convex sync)
  const [localLayouts, setLocalLayouts] = useState<Record<string, Layout[]> | null>(null);

  // Function to scroll to a grid position
  const scrollToPosition = useCallback((_x: number, y: number) => {
    if (!gridRef.current) return;

    // Find the scrollable container (main content area)
    const findScrollableContainer = (
      element: HTMLElement,
    ): HTMLElement | null => {
      let current = element.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        if (
          style.overflow === "auto" ||
          style.overflowY === "auto" ||
          current.classList.contains("overflow-auto")
        ) {
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
        behavior: "smooth",
      });
    } else {
      // Fallback to window scroll if no container found
      window.scrollTo({
        top: scrollTop,
        behavior: "smooth",
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
            layout: layout.map((item) => ({
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
          const widgetLayout = (currentLayout as LayoutItem[]).find(
            (item) => item.i === newWidget._id,
          );

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
  }, [
    widgets,
    layouts,
    currentBreakpoint,
    previousWidgetCount,
    scrollToPosition,
    maxRows,
    isAddingWidget,
    onScrollComplete,
  ]);

  // Keep track of widget count changes even when not adding widgets
  useEffect(() => {
    if (!widgets) return;

    // Only update the count if we're not in adding mode (to avoid interfering with the scroll logic above)
    if (!isAddingWidget && widgets.length !== previousWidgetCount) {
      setPreviousWidgetCount(widgets.length);
    }
  }, [widgets, isAddingWidget, previousWidgetCount]);

  // Handle layout change
  const handleLayoutChange = useCallback(
    (_layout: Layout[], allLayouts: Record<string, Layout[]>) => {
      if (!isEditable) return;

      // Check if any widget is in the last row and expand grid if needed
      if (_layout.length > 0) {
        const maxY = Math.max(..._layout.map((item) => item.y + item.h - 1));
        const maxAllowedRows = 20; // Maximum 20 rows to prevent infinite growth
        if (maxY >= maxRows - 1 && maxRows < maxAllowedRows) {
          setMaxRows((prev) => Math.min(prev + 1, maxAllowedRows)); // Add 1 row when needed, up to max
        }
      }

      setPendingLayouts(allLayouts);
    },
    [isEditable, maxRows],
  );

  // Handle breakpoint change
  const handleBreakpointChange = useCallback((breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  }, []);

  // Handle widget deletion
  const handleDeleteWidget = useCallback(
    (widgetId: string) => {
      if (!isEditable) return;
      setWidgetToDelete(widgetId);
      setShowDeleteDialog(true);
    },
    [isEditable],
  );

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

  // Handle widget size change from the size picker
  // Note: effectiveLayouts is referenced here but defined later; we use a ref to always read current value
  const effectiveLayoutsRef = useRef<Record<string, Layout[]>>({});

  const handleWidgetResize = (widgetId: string, size: WidgetSize) => {
    const widget = widgets?.find(w => w._id === widgetId);
    const configs = getWidgetSizeConfigs(widget?.config.chartType, widget?.type);
    const cfg = configs[size];
    if (!cfg) return;
    const base = effectiveLayoutsRef.current;
    const updated: Record<string, Layout[]> = {};
    for (const [bp, layout] of Object.entries(base)) {
      const w = cfg.breakpointDefaultW?.[bp] ?? cfg.defaultW;
      updated[bp] = (layout as LayoutItem[]).map((item) =>
        item.i === widgetId
          ? { ...item, w, h: cfg.h, minW: cfg.minW, maxW: cfg.maxW, minH: cfg.h, maxH: cfg.h, isResizable: false }
          : item
      );
    }
    setLocalLayouts(updated);
    setPendingLayouts(updated);
  };

  // Smart layout generation that preserves existing widget positions
  const generateDefaultLayout = useCallback(
    (widgets: WidgetDocument[]) => {
      const currentCols = cols[currentBreakpoint as keyof typeof cols];
      const existingLayouts = (layouts?.[currentBreakpoint] || []) as LayoutItem[];

      // Create a map of existing widget positions
      const existingPositions = new Map<string, LayoutItem>();
      existingLayouts.forEach((item) => {
        existingPositions.set(item.i, item);
      });

      // Create a grid to track occupied spaces
      const occupiedGrid = new Set<string>();
      existingLayouts.forEach((item) => {
        for (let x = item.x; x < item.x + item.w; x++) {
          for (let y = item.y; y < item.y + item.h; y++) {
            occupiedGrid.add(`${x},${y}`);
          }
        }
      });

      // Function to find next available position
      const findNextAvailablePosition = (w: number, h: number) => {
        for (let y = 0; y < maxRows; y++) {
          for (let x = 0; x <= currentCols - w; x++) {
            const fits = Array.from({ length: w }, (_, dx) =>
              Array.from({ length: h }, (_, dy) => !occupiedGrid.has(`${x + dx},${y + dy}`))
            ).flat().every(Boolean);
            if (fits) {
              for (let dx = 0; dx < w; dx++)
                for (let dy = 0; dy < h; dy++)
                  occupiedGrid.add(`${x + dx},${y + dy}`);
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
        const chartEntry = widget.config?.source?.chartId ? getChartById(widget.config.source.chartId) : undefined;
        const chartType = widget.config?.chartType as string | undefined;
        const fallbackConfig = getWidgetSizeConfigs(chartType, widget.type).small;
        const defaultW = Math.min(chartEntry?.defaultSize.w ?? fallbackConfig?.defaultW ?? 1, currentCols);
        const defaultH = chartEntry?.defaultSize.h ?? fallbackConfig?.h ?? 1;
        const position = findNextAvailablePosition(defaultW, defaultH);
        return {
          i: widget._id,
          x: position.x,
          y: position.y,
          w: defaultW,
          h: defaultH,
          minW: 1,
          minH: 1,
        };
      });
    },
    [currentBreakpoint, layouts, maxRows],
  );

  // Show loading state
  if (widgets === undefined || layouts === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-primary-subtle)] border-t-[var(--color-border-brand)]"></div>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Loading widgets...
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no widgets
  if (!widgets || widgets.length === 0) {
    return (
      <EmptyState
        title="Add widgets"
        description="This board is empty. Start building your board by adding widgets like charts and tables."
        actionLabel={isEditable && onAddWidget ? "Add Widget" : undefined}
        onAction={isEditable && onAddWidget ? onAddWidget : undefined}
      />
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
      const existingLayout = (updatedLayouts[breakpoint] || []) as LayoutItem[];
      const existingWidgetIds = new Set(
        existingLayout.map((item) => item.i),
      );
      const newWidgets = widgets.filter(
        (widget) => !existingWidgetIds.has(widget._id),
      );

      // Apply size constraints derived from h for all existing items
      const constrainedLayout = existingLayout.map((item) => {
        const widget = widgets?.find((w) => w._id === item.i);
        if (widget?.type === "empty") return item; // free sizing — skip constraints
        const chartType = widget?.config?.chartType as string | undefined;
        return withSizeConstraints(item, breakpoint, widget?.type, chartType);
      });

      if (newWidgets.length > 0) {
        // Create occupied grid for this breakpoint
        const currentCols = cols[breakpoint as keyof typeof cols];
        const occupiedGrid = new Set<string>();
        constrainedLayout.forEach((item) => {
          for (let x = item.x; x < item.x + item.w; x++) {
            for (let y = item.y; y < item.y + item.h; y++) {
              occupiedGrid.add(`${x},${y}`);
            }
          }
        });

        // Find positions for new widgets
        const newLayoutItems = newWidgets.map((widget) => {
          const chartEntry = getChartById(widget.config?.source?.chartId);
          const chartType = widget.config?.chartType as string | undefined;
          const configs = getWidgetSizeConfigs(chartType, widget.type);
          const fallbackConfig = configs.small;
          const defaultH = chartEntry?.defaultSize.h ?? fallbackConfig?.h ?? 1;
          const size = getSizeFromRows(defaultH);
          const sizeConfig = size ? configs[size] : null;
          const bpDefaultW = sizeConfig?.breakpointDefaultW?.[breakpoint] ?? sizeConfig?.defaultW ?? 0;
          const defaultW = Math.min(Math.max(chartEntry?.defaultSize.w ?? fallbackConfig?.defaultW ?? 1, bpDefaultW), currentCols);

          // Find a position that fits the full w×h footprint
          for (let y = 0; y < maxRows; y++) {
            for (let x = 0; x <= currentCols - defaultW; x++) {
              const fits = Array.from({ length: defaultW }, (_, dx) =>
                Array.from({ length: defaultH }, (_, dy) => !occupiedGrid.has(`${x + dx},${y + dy}`))
              ).flat().every(Boolean);
              if (fits) {
                for (let dx = 0; dx < defaultW; dx++)
                  for (let dy = 0; dy < defaultH; dy++)
                    occupiedGrid.add(`${x + dx},${y + dy}`);
                return { i: widget._id, x, y, w: defaultW, h: defaultH, minW: 1, minH: 1 };
              }
            }
          }
          // Fallback: append below existing content
          return { i: widget._id, x: 0, y: maxRows, w: defaultW, h: defaultH, minW: 1, minH: 1 };
        });

        updatedLayouts[breakpoint] = [...constrainedLayout, ...newLayoutItems];
      } else {
        updatedLayouts[breakpoint] = constrainedLayout;
      }
    }

    return updatedLayouts;
  })();

  // Effective layouts: local overrides take priority over Convex layouts
  const effectiveLayouts = localLayouts ?? currentLayouts;
  effectiveLayoutsRef.current = effectiveLayouts;

  // Inject isResizable: true for empty widgets so RGL renders the SE handle
  const gridLayouts = Object.fromEntries(
    Object.entries(effectiveLayouts).map(([bp, layout]) => [
      bp,
      (layout as LayoutItem[]).map((item) => {
        const widget = widgets.find((w) => w._id === item.i);
        return widget?.type === "empty"
          ? { ...item, isResizable: isEditable }
          : item;
      }),
    ])
  );

  return (
    <div className="w-full">
      {/* Responsive grid container */}
      <div className="relative" ref={gridRef}>
        <ResponsiveGridLayout
          className="layout"
          layouts={gridLayouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={240}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={isEditable}
          isResizable={false}
          draggableHandle=".widget-drag-handle"
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          // Free placement with widget pushing during resize
          compactType="vertical"
          preventCollision={false}
          allowOverlap={false}
          maxRows={maxRows}
        >
          {widgets.map((widget) => {
            const layoutItem = (effectiveLayouts[currentBreakpoint] as LayoutItem[] | undefined)?.find(
              (l) => l.i === widget._id
            );
            return (
              <div key={widget._id} className="relative h-full w-full">
                <WidgetRenderer
                  widget={widget}
                  rows={layoutItem?.h ?? 1}
                  isEditable={isEditable}
                  onDelete={() => handleDeleteWidget(widget._id)}
                  onResize={isEditable && widget.type !== "empty" ? handleWidgetResize : undefined}
                />
              </div>
            );
          })}
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
              Are you sure you want to remove this widget? This action cannot be
              undone.
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
