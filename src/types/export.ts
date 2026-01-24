/**
 * Export format types
 */
export type ExportFormat = "csv" | "excel" | "pdf";

/**
 * Data scope for export
 */
export type ExportDataScope = "all" | "bookmark" | "filtered";

/**
 * Date range filter
 */
export type ExportDateRange = "all" | "custom";

/**
 * Grouping behavior for export
 */
export type ExportGrouping = "flatten" | "preserve";

/**
 * Status formatting options
 */
export type StatusFormat = "full" | "short" | "value";

/**
 * Date range selection
 */
export interface DateRangeFilter {
  type: ExportDateRange;
  from?: Date;
  to?: Date;
}

/**
 * Column configuration for export
 */
export interface ExportColumn {
  id: string;
  label: string;
  selected: boolean;
  order: number;
}

/**
 * Export configuration options
 */
export interface ExportOptions {
  // Format selection
  format: ExportFormat;

  // Data scope
  dataScope: ExportDataScope;

  // Column selection
  columns: ExportColumn[];

  // Date range filter
  dateRange: DateRangeFilter;

  // File naming
  fileName: string;

  // Grouping options
  grouping?: ExportGrouping;

  // Status formatting
  statusFormat?: StatusFormat;

  // Excel-specific options
  excel?: {
    freezeHeader: boolean;
    autoFitColumns: boolean;
    splitByGroup: boolean;
  };

  // PDF-specific options
  pdf?: {
    orientation: "portrait" | "landscape";
    pageSize: "a4" | "letter";
    includePageNumbers: boolean;
  };
}

/**
 * Export callbacks for progress notifications
 */
export interface ExportCallbacks {
  onStart?: () => void;
  onProgress?: (stage: 'preparing' | 'generating' | 'ready') => void;
  onComplete?: (result: { recordCount: number; fileName: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize?: number;
  rowCount: number;
  error?: string;
  blob?: Blob;
}
