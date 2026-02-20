import { type ColumnDef } from "@tanstack/react-table";
import { Flag } from "@rafal.lemieszewski/tide-ui";
import type { FixtureData } from "../../types/fixture";
import type { CellContext } from "@tanstack/react-table";
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatTimestamp,
  pluralize,
} from "../../utils/dataUtils";

// Type alias for TanStack Table
type FixtureCellContext<TValue = unknown> = CellContext<FixtureData, TValue>;

// Type guard for filtering out null/undefined values
const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

// ── Highlight function type ──────────────────────────────────────────────────
export type Highlighter = (text: string) => React.ReactNode;

const HIGHLIGHT_STYLE = {
  backgroundColor: 'var(--yellow-200, #fef08a)',
  color: 'var(--color-text-primary, inherit)',
  borderRadius: '2px',
  padding: '0 2px',
} as const;

/**
 * Factory that returns a highlight function with cached regex.
 * Build once per createFixtureColumns call; pass to all columns.
 */
export function createHighlighter(terms: string[]): Highlighter | null {
  if (!terms.length) return null;
  const pattern = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const splitRegex = new RegExp(`(${pattern})`, "gi");
  const testRegex = new RegExp(`^(${pattern})$`, "i");
  return (text: string) => {
    if (!text) return text;
    const parts = text.split(splitRegex);
    return parts.map((part, i) =>
      testRegex.test(part) ? (
        <mark key={i} style={HIGHLIGHT_STYLE}>
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };
}

// ── Icon factory helper ──────────────────────────────────────────────────────
type IconComponent = ({ className }: { className?: string }) => React.ReactNode;

// ── Shared config types ──────────────────────────────────────────────────────

interface TextColumnConfig {
  accessorKey: keyof FixtureData & string;
  header: string;
  label: string;
  size?: number;
  filterGroup?: string;
  filterVariant?: "multiselect" | "text";
  icon?: IconComponent;
  enableGrouping?: boolean;
  enableGlobalFilter?: boolean;
  enableSorting?: boolean;
  /** Field on row.original to extract aggregated values from */
  aggregatedField?: keyof FixtureData & string;
  /** Plural noun for "N {things}" aggregated display */
  aggregatedNoun?: string;
  /** Use monospace font? */
  mono?: boolean;
  /** Use highlight on cell text? */
  highlight?: boolean;
}

interface NumericColumnConfig {
  accessorKey: keyof FixtureData & string;
  header: string;
  label: string;
  size?: number;
  filterGroup?: string;
  icon?: IconComponent;
  enableGrouping?: boolean;
  enableSorting?: boolean;
  /** Format function for display (defaults to dollar formatting) */
  format?: "currency" | "currencyInline" | "percent" | "quantity" | "percentSigned" | "days";
}

interface DateColumnConfig {
  accessorKey: keyof FixtureData & string;
  header: string;
  label: string;
  size?: number;
  filterGroup?: string;
  icon?: IconComponent;
  enableGrouping?: boolean;
  enableSorting?: boolean;
  dateGranularity?: "day" | "month";
}

// ── Numeric formatting helpers ───────────────────────────────────────────────

function formatDollar(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseNumericValue(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "string" ? parseFloat(value as string) : (value as number);
  return isNaN(num) ? null : num;
}

// ── Text Column Factory ──────────────────────────────────────────────────────

export function createTextColumn(
  config: TextColumnConfig,
  highlight: Highlighter | null,
): ColumnDef<FixtureData> {
  const {
    accessorKey,
    header,
    label,
    size,
    filterGroup,
    filterVariant = "multiselect",
    icon,
    enableGrouping = false,
    enableGlobalFilter = true,
    enableSorting,
    aggregatedField,
    aggregatedNoun,
    mono = false,
    highlight: shouldHighlight = false,
  } = config;

  const fieldForAggregation = aggregatedField ?? accessorKey;
  const noun = aggregatedNoun ?? label.toLowerCase() + "s";
  const fontClass = mono ? "font-mono " : "";

  const col: ColumnDef<FixtureData> = {
    accessorKey,
    header,
    ...(size != null && { size }),
    meta: {
      label,
      align: "left" as const,
      ...(filterGroup && {
        filterable: true,
        filterVariant,
        filterGroup,
      }),
      ...(icon && { icon }),
    },
    enableGrouping,
    enableGlobalFilter,
    ...(enableSorting != null && { enableSorting }),
    cell: ({ getValue }: FixtureCellContext) => {
      const value = getValue<string>();
      if (!value || value === "–") {
        return (
          <div className="text-body-sm text-[var(--color-text-secondary)]">
            –
          </div>
        );
      }
      return (
        <div className={`text-body-sm ${fontClass}text-[var(--color-text-primary)]`}>
          {shouldHighlight && highlight ? highlight(value) : value}
        </div>
      );
    },
    aggregatedCell: ({ row }: FixtureCellContext) => {
      const values = new Set(
        row.subRows?.map((r) => r.original[fieldForAggregation] as string) || [],
      );
      if (values.size === 1) {
        const value = Array.from(values)[0] as string;
        return (
          <div className={`text-body-sm ${fontClass}text-[var(--color-text-primary)]`}>
            {shouldHighlight && highlight ? highlight(value || "–") : (value || "–")}
          </div>
        );
      }
      return (
        <div className="text-body-sm text-[var(--color-text-secondary)]">
          {values.size} {noun}
        </div>
      );
    },
  };

  return col;
}

// ── Numeric Column Factory ───────────────────────────────────────────────────

export function createNumericColumn(
  config: NumericColumnConfig,
): ColumnDef<FixtureData> {
  const {
    accessorKey,
    header,
    label,
    size,
    filterGroup,
    icon,
    enableGrouping = false,
    enableSorting,
    format = "currencyInline",
  } = config;

  // Choose cell formatter
  const formatValue = (value: unknown): string | null => {
    const num = parseNumericValue(value);
    if (num == null) return null;
    switch (format) {
      case "currency":
        return formatCurrency(num);
      case "currencyInline":
        return formatDollar(num);
      case "percent":
        return formatPercent(num, 2);
      case "percentSigned":
        return formatPercent(num, 2, true);
      case "quantity":
        return formatQuantity(num);
      case "days":
        return num === 0 ? "Same day" : pluralize(num, "day");
      default:
        return formatDollar(num);
    }
  };

  // Percent-signed columns use color coding
  const isSignedPercent = format === "percentSigned";

  const col: ColumnDef<FixtureData> = {
    accessorKey,
    header,
    ...(size != null && { size }),
    meta: {
      label,
      align: "right" as const,
      ...(filterGroup && {
        filterable: true,
        filterVariant: "number" as const,
        filterGroup,
      }),
      ...(icon && { icon }),
    },
    enableGrouping,
    ...(enableSorting != null && { enableSorting }),
    cell: ({ getValue }: FixtureCellContext) => {
      const value = getValue<string | number>();

      if (isSignedPercent) {
        const num = parseNumericValue(value);
        if (num == null) {
          return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
        }
        // For freight savings: positive = good (green), negative = bad (red)
        // For freight vs market: negative = good (green), positive = bad (red)
        const color =
          accessorKey === "freightVsMarketPercent"
            ? num < 0 ? "text-[var(--green-600)]" : num > 0 ? "text-[var(--red-600)]" : "text-[var(--color-text-primary)]"
            : num > 0 ? "text-[var(--green-600)]" : num < 0 ? "text-[var(--red-600)]" : "text-[var(--color-text-primary)]";
        return (
          <div className={`text-body-sm ${color} text-right font-variant-numeric-tabular`}>
            {formatValue(value)}
          </div>
        );
      }

      const formatted = formatValue(value);
      return (
        <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
          {formatted ?? "–"}
        </div>
      );
    },
  };

  // Percent-signed and days columns don't get aggregated cells
  if (!isSignedPercent && format !== "days") {
    col.aggregatedCell = ({ row }: FixtureCellContext) => {
      const values = row.subRows
        ?.map((r) => parseNumericValue(r.original[accessorKey]))
        .filter((v): v is number => v != null) || [];
      if (values.length === 0) {
        return <div className="text-body-sm text-[var(--color-text-secondary)] text-right">–</div>;
      }
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (min === max) {
        return (
          <div className="text-body-sm text-[var(--color-text-primary)] text-right font-variant-numeric-tabular">
            {formatValue(min)}
          </div>
        );
      }
      return (
        <div className="text-body-sm text-[var(--color-text-secondary)] text-right font-variant-numeric-tabular">
          {formatValue(min)} – {formatValue(max)}
        </div>
      );
    };
  }

  return col;
}

// ── Date Column Factory ──────────────────────────────────────────────────────

export function createDateColumn(
  config: DateColumnConfig,
): ColumnDef<FixtureData> {
  const {
    accessorKey,
    header,
    label,
    size,
    filterGroup,
    icon,
    enableGrouping = false,
    enableSorting,
    dateGranularity,
  } = config;

  return {
    accessorKey,
    header,
    ...(size != null && { size }),
    meta: {
      label,
      align: "left" as const,
      ...(filterGroup && {
        filterable: true,
        filterVariant: "date" as const,
        filterGroup,
      }),
      ...(dateGranularity && { dateGranularity }),
      ...(icon && { icon }),
    },
    enableGrouping,
    ...(enableSorting != null && { enableSorting }),
    cell: ({ getValue }: FixtureCellContext) => {
      const value = getValue<number>();
      return (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {value ? formatTimestamp(value) : "–"}
        </div>
      );
    },
    aggregatedCell: ({ row }: FixtureCellContext) => {
      const timestamps =
        row.subRows?.map((r) => r.original[accessorKey] as number | undefined).filter(isDefined) || [];
      if (timestamps.length === 0) {
        return <div className="text-body-sm text-[var(--color-text-secondary)]">–</div>;
      }
      const earliest = Math.min(...timestamps);
      const latest = Math.max(...timestamps);
      if (earliest === latest) {
        return (
          <div className="text-body-sm text-[var(--color-text-primary)]">
            {formatTimestamp(latest)}
          </div>
        );
      }
      return (
        <div className="text-body-sm text-[var(--color-text-secondary)]">
          {formatTimestamp(earliest)} – {formatTimestamp(latest)}
        </div>
      );
    },
  };
}

// ── Country Column Factory (text + flag) ─────────────────────────────────────

interface CountryColumnConfig {
  accessorKey: keyof FixtureData & string;
  header: string;
  label: string;
  size?: number;
  filterGroup: string;
  icon: IconComponent;
  /** Field on row.original for the country code */
  countryCodePath: "loadPort" | "dischargePort";
  aggregatedNoun?: string;
}

export function createCountryColumn(
  config: CountryColumnConfig,
): ColumnDef<FixtureData> {
  const {
    accessorKey,
    header,
    label,
    size,
    filterGroup,
    icon,
    countryCodePath,
    aggregatedNoun = "countries",
  } = config;

  return {
    accessorKey,
    header,
    ...(size != null && { size }),
    meta: {
      label,
      align: "left" as const,
      filterable: true,
      filterVariant: "multiselect" as const,
      filterGroup,
      icon,
    },
    enableGrouping: true,
    enableGlobalFilter: true,
    cell: ({ getValue, row }: FixtureCellContext) => {
      const value = getValue<string>();
      const countryCode = row.original[countryCodePath]?.countryCode;
      return (
        <div className="flex items-center gap-2">
          {countryCode && <Flag country={countryCode} />}
          <div className="text-body-sm text-[var(--color-text-primary)]">
            {value || "–"}
          </div>
        </div>
      );
    },
    aggregatedCell: ({ row }: FixtureCellContext) => {
      const values = new Set(
        row.subRows?.map((r) => r.original[accessorKey] as string) || [],
      );
      if (values.size === 1) {
        const value = Array.from(values)[0] as string;
        const countryCode = row.subRows?.[0]?.original[countryCodePath]?.countryCode;
        return (
          <div className="flex items-center gap-2">
            {countryCode && <Flag country={countryCode} />}
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {value || "–"}
            </div>
          </div>
        );
      }
      return (
        <div className="text-body-sm text-[var(--color-text-secondary)]">
          {values.size} {aggregatedNoun}
        </div>
      );
    },
  };
}
