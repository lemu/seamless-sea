/**
 * Widget type definitions for the dashboard system
 * Used by widget components and the widget grid
 */
import type { Id } from "../../convex/_generated/dataModel";
import type { Layout } from "react-grid-layout";
import type { ChartSection } from "../data/chartRegistry";

// ============================================================================
// Widget Source Contract
// ============================================================================

/**
 * Records where a widget came from and how to re-fetch its data.
 * Stored in widget config — board widgets are independent of the source.
 */
export interface WidgetSource {
  section: ChartSection;
  chartId: string;
  entityId?: string; // e.g. vesselId, routeId
  tab?: string;
  filters: Record<string, unknown>;
}

// ============================================================================
// Widget Types
// ============================================================================

/**
 * Available widget types
 */
export type WidgetType = "chart" | "table" | "empty" | "news_ticker";

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
  chartType: "bar" | "line" | "pie" | "area" | "timeseries";
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
 * News ticker widget configuration
 */
export interface NewsTickerWidgetConfig extends BaseWidgetConfig {
  filters: {
    region?: string;
    category?: string;
    vesselType?: string;
    impactLevel?: "high" | "medium" | "low";
  };
  limit?: number;
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
  // Source contract — where this widget came from
  source?: WidgetSource;

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
// Widget Size Tiers
// ============================================================================

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetSizeConfig {
  label: string;
  h: number;
  defaultW: number;
  breakpointDefaultW?: Partial<Record<string, number>>;
  minW: number;
  maxW: number;
  chartHeight: number;
}

export const WIDGET_SIZE_CONFIGS: Record<WidgetSize, WidgetSizeConfig> = {
  small:  { label: "Small",  h: 1, defaultW: 1, minW: 1, maxW: 2, chartHeight: 160 },
  medium: { label: "Medium", h: 2, defaultW: 2, minW: 2, maxW: 4, chartHeight: 416 },
  large:  { label: "Large",  h: 3, defaultW: 3, minW: 3, maxW: 4, chartHeight: 672 },
};

export const TIMESERIES_SIZE_CONFIGS: Partial<Record<WidgetSize, WidgetSizeConfig>> = {
  small:  { label: "Small",  h: 1, defaultW: 2, breakpointDefaultW: { lg: 2 }, minW: 2, maxW: 2, chartHeight: 160 },
  medium: { label: "Medium", h: 2, defaultW: 4, minW: 4, maxW: 4, chartHeight: 416 },
};

export const NEWS_TICKER_SIZE_CONFIGS: Partial<Record<WidgetSize, WidgetSizeConfig>> = {
  small:  { label: "Ticker", h: 1, defaultW: 4, minW: 4, maxW: 4, chartHeight: 64 },
  medium: { label: "List",   h: 2, defaultW: 3, minW: 2, maxW: 4, chartHeight: 416 },
};

// Full-width stripe: 1×4 on lg, clamps to 1×2 on md, 1×1 on sm (react-grid-layout auto-clamps)
export const NEWS_STRIPE_SIZE_CONFIGS: Partial<Record<WidgetSize, WidgetSizeConfig>> = {
  small: { label: "Stripe", h: 1, defaultW: 4, minW: 4, maxW: 4, chartHeight: 64 },
};

export function getWidgetSizeConfigs(chartType?: string): Partial<Record<WidgetSize, WidgetSizeConfig>> {
  if (chartType === "timeseries") return TIMESERIES_SIZE_CONFIGS;
  return WIDGET_SIZE_CONFIGS;
}

export function getSizeFromRows(h: number): WidgetSize | null {
  if (h === 1) return "small";
  if (h === 2) return "medium";
  if (h === 3) return "large";
  return null;
}

export function getSizeFromRowsForConfigs(
  h: number,
  configs: Partial<Record<WidgetSize, WidgetSizeConfig>>
): WidgetSize | null {
  const entry = Object.entries(configs).find(([, cfg]) => cfg.h === h);
  return entry ? (entry[0] as WidgetSize) : null;
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
