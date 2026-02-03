/**
 * Widget type definitions for the dashboard system
 * Used by widget components and the widget grid
 */
import type { Id } from "../../convex/_generated/dataModel";
import type { Layout } from "react-grid-layout";

// ============================================================================
// Widget Types
// ============================================================================

/**
 * Available widget types
 */
export type WidgetType = "chart" | "table" | "empty";

// ============================================================================
// Widget Configuration Types
// ============================================================================

/**
 * Base configuration shared by all widgets
 */
interface BaseWidgetConfig {
  title: string;
}

/**
 * Chart widget configuration
 */
export interface ChartWidgetConfig extends BaseWidgetConfig {
  chartType: "bar" | "line" | "pie" | "area";
  dataSource?: string;
  xAxis?: string;
  yAxis?: string;
  data?: Array<{ label: string; value: number; color?: string }>;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
}

/**
 * Table widget configuration
 */
export interface TableWidgetConfig extends BaseWidgetConfig {
  dataSource?: string;
  columns: Array<{
    key: string;
    title: string;
    width?: number;
    sortable?: boolean;
    align?: "left" | "center" | "right";
  }>;
  data?: Array<Record<string, unknown>>;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
}

/**
 * Empty widget configuration (for debugging/testing)
 */
export interface EmptyWidgetConfig extends BaseWidgetConfig {
  showBorder?: boolean;
  showBackground?: boolean;
  debugInfo?: boolean;
}

/**
 * Discriminated union of all widget configurations
 * Use the type guard functions to narrow the type
 */
export type WidgetConfigUnion =
  | ({ type: "chart" } & ChartWidgetConfig)
  | ({ type: "table" } & TableWidgetConfig)
  | ({ type: "empty" } & EmptyWidgetConfig);

/**
 * Generic widget config type for when type is not known
 * Used for database storage and generic handling
 */
export interface GenericWidgetConfig extends BaseWidgetConfig {
  // Chart-specific fields
  chartType?: string; // ChartType from tide-ui - using string to avoid import dependency
  dataSource?: string;
  xAxis?: string;
  yAxis?: string;
  data?: Array<{ label: string; value: number; color?: string }> | Array<Record<string, unknown>>;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  config?: unknown; // TideChartConfig

  // Table-specific fields
  columns?: Array<{
    key: string;
    title: string;
    width?: number;
    sortable?: boolean;
    align?: "left" | "center" | "right";
  }>;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;

  // Empty widget fields
  showBorder?: boolean;
  showBackground?: boolean;
  debugInfo?: boolean;
}

// ============================================================================
// Widget Document (from database)
// ============================================================================

/**
 * Widget document as stored in the database
 */
export interface WidgetDocument {
  _id: Id<"widgets">;
  boardId: Id<"boards">;
  type: WidgetType;
  title: string;
  config: GenericWidgetConfig;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Layout Types
// ============================================================================

/**
 * Extended layout item with widget ID
 */
export interface WidgetLayoutItem extends Layout {
  i: string; // Widget ID
}

/**
 * Layout configuration for a breakpoint
 */
export interface BreakpointLayouts {
  lg: WidgetLayoutItem[];
  md: WidgetLayoutItem[];
  sm: WidgetLayoutItem[];
}

// ============================================================================
// Widget Definition (for registry)
// ============================================================================

/**
 * Widget definition for the widget registry
 */
export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  defaultConfig: GenericWidgetConfig;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a widget config is a chart config
 */
export function isChartConfig(
  type: WidgetType,
  config: GenericWidgetConfig
): config is ChartWidgetConfig {
  return type === "chart" && config.chartType !== undefined;
}

/**
 * Check if a widget config is a table config
 */
export function isTableConfig(
  type: WidgetType,
  config: GenericWidgetConfig
): config is TableWidgetConfig {
  return type === "table" && config.columns !== undefined;
}

/**
 * Check if a widget config is an empty config
 */
export function isEmptyConfig(
  type: WidgetType,
  _config: GenericWidgetConfig
): _config is EmptyWidgetConfig {
  return type === "empty";
}
