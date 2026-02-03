import Papa from "papaparse";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ExportOptions,
  ExportResult,
  ExportColumn,
  ExportCallbacks,
} from "../types/export";
import { formatDateTime } from "./dataUtils";

// Type augmentation for jsPDF internal properties
interface JsPDFInternal {
  internal: {
    pages: unknown[];
    getCurrentPageInfo(): { pageNumber: number };
  };
}

/**
 * Download a file to the user's device
 */
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Filter data by date range
 */
function filterByDateRange<T extends Record<string, unknown>>(
  data: T[],
  dateField: string,
  from?: Date,
  to?: Date
): T[] {
  if (!from && !to) return data;

  return data.filter((row) => {
    const dateValue = row[dateField];
    if (typeof dateValue !== 'number' && typeof dateValue !== 'string') return true;
    const rowDate = new Date(dateValue);
    if (from && rowDate < from) return false;
    if (to && rowDate > to) return false;
    return true;
  });
}

/**
 * Format a value for export based on its column type
 * @param value - The value to format
 * @param columnId - The column identifier to determine formatting
 * @returns Formatted string or number for export
 */
function formatValueForExport(value: unknown, columnId: string): string | number {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return "";
  }

  // Handle dates - check if it's a timestamp field
  const isDateField = columnId.toLowerCase().includes("date") ||
    columnId.toLowerCase().includes("at") ||
    columnId === "lastUpdated" ||
    columnId === "laycanStart" ||
    columnId === "laycanEnd" ||
    columnId === "createdAt" ||
    columnId === "updatedAt";

  if (isDateField && typeof value === "number" && value > 1000000000000) {
    return formatDateTime(value);
  }

  // Handle numbers - format with locale string for readability
  if (typeof value === "number") {
    // Check if it's a percentage or rate field
    const isPercentField = columnId.toLowerCase().includes("percent") ||
      columnId.toLowerCase().includes("savings");
    if (isPercentField) {
      return `${value.toFixed(2)}%`;
    }

    // Check if it's a currency/rate field
    const isCurrencyField = columnId.toLowerCase().includes("freight") ||
      columnId.toLowerCase().includes("demurrage") ||
      columnId.toLowerCase().includes("commission") ||
      columnId.toLowerCase().includes("rate") ||
      columnId.toLowerCase().includes("gross");
    if (isCurrencyField) {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    // Check if it's a quantity field
    const isQuantityField = columnId.toLowerCase().includes("quantity");
    if (isQuantityField) {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }

    // Return raw number for other numeric fields
    return value;
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Return string representation for everything else
  return String(value);
}

/**
 * Select and order columns based on export configuration
 */
function selectColumns<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[]
): Record<string, unknown>[] {
  const selectedColumns = columns
    .filter((col) => col.selected)
    .sort((a, b) => a.order - b.order);

  return data.map((row) => {
    const newRow: Record<string, unknown> = {};
    selectedColumns.forEach((col) => {
      newRow[col.label] = formatValueForExport(row[col.id], col.id);
    });
    return newRow;
  });
}

/**
 * Helper to add artificial delay for better UX
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Export data as CSV
 */
export async function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  callbacks?: ExportCallbacks
): Promise<ExportResult> {
  try {
    callbacks?.onProgress?.('preparing');
    await delay(900); // Show "preparing" toast

    // Filter by date range if specified
    let filteredData = data;
    if (options.dateRange.type === "custom") {
      filteredData = filterByDateRange(
        data,
        "lastUpdated",
        options.dateRange.from,
        options.dateRange.to
      );
    }

    // Select and order columns
    const exportData = selectColumns(filteredData, options.columns);

    callbacks?.onProgress?.('generating');
    await delay(600); // Show "generating" toast

    // Generate CSV with Papa Parse
    const csv = Papa.unparse(exportData);

    // Add UTF-8 BOM for Excel compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], {
      type: "text/csv;charset=utf-8;",
    });

    callbacks?.onProgress?.('ready');
    await delay(900); // Show "ready" toast

    // Download file
    const fileName = `${options.fileName}.csv`;
    downloadFile(blob, fileName);

    callbacks?.onComplete?.({
      recordCount: exportData.length,
      fileName,
    });

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      rowCount: exportData.length,
      blob,
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error("Failed to export CSV");
    callbacks?.onError?.(errorObj);

    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error: errorObj.message,
    };
  }
}

/**
 * Export data as Excel
 */
export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  callbacks?: ExportCallbacks
): Promise<ExportResult> {
  try {
    callbacks?.onProgress?.('preparing');
    await delay(900); // Show "preparing" toast

    // Filter by date range if specified
    let filteredData = data;
    if (options.dateRange.type === "custom") {
      filteredData = filterByDateRange(
        data,
        "lastUpdated",
        options.dateRange.from,
        options.dateRange.to
      );
    }

    // Select and order columns
    const exportData = selectColumns(filteredData, options.columns);

    callbacks?.onProgress?.('generating');
    await delay(600); // Show "generating" toast

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Fixtures");

    // Get column headers from first row
    const headers = Object.keys(exportData[0] || {});

    // Add header row
    worksheet.addRow(headers);

    // Add data rows
    exportData.forEach((row) => {
      worksheet.addRow(headers.map((header) => row[header]));
    });

    // Apply Excel-specific options
    if (options.excel?.freezeHeader) {
      worksheet.views = [
        { state: "frozen", ySplit: 1 }
      ];
    }

    if (options.excel?.autoFitColumns) {
      // Calculate column widths
      worksheet.columns = headers.map((key) => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] || "").length)
        );
        return {
          header: key,
          key: key,
          width: Math.min(maxLength + 2, 50)
        };
      });
    }

    // Generate Excel file
    const excelBuffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    callbacks?.onProgress?.('ready');
    await delay(900); // Show "ready" toast

    // Download file
    const fileName = `${options.fileName}.xlsx`;
    downloadFile(blob, fileName);

    callbacks?.onComplete?.({
      recordCount: exportData.length,
      fileName,
    });

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      rowCount: exportData.length,
      blob,
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error("Failed to export Excel");
    callbacks?.onError?.(errorObj);

    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error: errorObj.message,
    };
  }
}

/**
 * Export data as PDF
 */
export async function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  callbacks?: ExportCallbacks
): Promise<ExportResult> {
  try {
    callbacks?.onProgress?.('preparing');
    await delay(900); // Show "preparing" toast

    // Filter by date range if specified
    let filteredData = data;
    if (options.dateRange.type === "custom") {
      filteredData = filterByDateRange(
        data,
        "lastUpdated",
        options.dateRange.from,
        options.dateRange.to
      );
    }

    // Select and order columns
    const exportData = selectColumns(filteredData, options.columns);

    callbacks?.onProgress?.('generating');
    await delay(600); // Show "generating" toast

    // Create PDF document
    const orientation = options.pdf?.orientation || "landscape";
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: options.pdf?.pageSize || "a4",
    });

    // Prepare table data
    const headers = Object.keys(exportData[0] || {});
    const rows = exportData.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Convert to string/number for PDF table
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' || typeof value === 'number') return value;
        return String(value);
      })
    );

    // Add table to PDF
    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { top: 10 },
      didDrawPage: (_data) => {
        // Add page numbers if requested
        if (options.pdf?.includePageNumbers) {
          const docInternal = doc as unknown as JsPDFInternal;
          const pageCount = docInternal.internal.pages.length - 1;
          const currentPage = docInternal.internal.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.text(
            `Page ${currentPage} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 5,
            { align: "center" }
          );
        }
      },
    });

    // Generate blob
    const blob = doc.output("blob");

    callbacks?.onProgress?.('ready');
    await delay(900); // Show "ready" toast

    // Download file
    const fileName = `${options.fileName}.pdf`;
    downloadFile(blob, fileName);

    callbacks?.onComplete?.({
      recordCount: exportData.length,
      fileName,
    });

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      rowCount: exportData.length,
      blob,
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error("Failed to export PDF");
    callbacks?.onError?.(errorObj);

    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error: errorObj.message,
    };
  }
}

/**
 * Main export function that delegates to format-specific exporters
 */
export async function exportData<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  callbacks?: ExportCallbacks
): Promise<ExportResult> {
  try {
    callbacks?.onStart?.();

    switch (options.format) {
      case "csv":
        return await exportToCSV(data, options, callbacks);
      case "excel":
        return await exportToExcel(data, options, callbacks);
      case "pdf":
        return await exportToPDF(data, options, callbacks);
      default:
        const error = new Error(`Unsupported export format: ${options.format}`);
        callbacks?.onError?.(error);
        return {
          success: false,
          fileName: options.fileName,
          rowCount: 0,
          error: error.message,
        };
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error("Export failed");
    callbacks?.onError?.(errorObj);
    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error: errorObj.message,
    };
  }
}

/**
 * Generate default file name with current date
 */
export function generateFileName(prefix: string = "export"): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}`;
}
