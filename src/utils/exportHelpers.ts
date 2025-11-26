import Papa from "papaparse";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ExportOptions,
  ExportResult,
  ExportColumn,
} from "../types/export";

/**
 * Download a file to the user's device
 */
function downloadFile(blob: Blob, fileName: string): void {
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
function filterByDateRange<T extends Record<string, any>>(
  data: T[],
  dateField: string,
  from?: Date,
  to?: Date
): T[] {
  if (!from && !to) return data;

  return data.filter((row) => {
    const rowDate = new Date(row[dateField]);
    if (from && rowDate < from) return false;
    if (to && rowDate > to) return false;
    return true;
  });
}

/**
 * Select and order columns based on export configuration
 */
function selectColumns<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[]
): Record<string, any>[] {
  const selectedColumns = columns
    .filter((col) => col.selected)
    .sort((a, b) => a.order - b.order);

  return data.map((row) => {
    const newRow: Record<string, any> = {};
    selectedColumns.forEach((col) => {
      newRow[col.label] = row[col.id];
    });
    return newRow;
  });
}

/**
 * Export data as CSV
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): ExportResult {
  try {
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

    // Generate CSV with Papa Parse
    const csv = Papa.unparse(exportData);

    // Add UTF-8 BOM for Excel compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], {
      type: "text/csv;charset=utf-8;",
    });

    // Download file
    const fileName = `${options.fileName}.csv`;
    downloadFile(blob, fileName);

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      rowCount: exportData.length,
    };
  } catch (error) {
    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error:
        error instanceof Error ? error.message : "Failed to export CSV",
    };
  }
}

/**
 * Export data as Excel
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): ExportResult {
  try {
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

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Apply Excel-specific options
    if (options.excel?.freezeHeader) {
      worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    }

    if (options.excel?.autoFitColumns) {
      // Calculate column widths
      const colWidths = Object.keys(exportData[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] || "").length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet["!cols"] = colWidths;
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fixtures");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Download file
    const fileName = `${options.fileName}.xlsx`;
    downloadFile(blob, fileName);

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      rowCount: exportData.length,
    };
  } catch (error) {
    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error:
        error instanceof Error ? error.message : "Failed to export Excel",
    };
  }
}

/**
 * Export data as PDF
 */
export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): ExportResult {
  try {
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

    // Create PDF document
    const orientation = options.pdf?.orientation || "landscape";
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: options.pdf?.pageSize || "a4",
    });

    // Prepare table data
    const headers = Object.keys(exportData[0] || {});
    const rows = exportData.map((row) => headers.map((header) => row[header]));

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
          const pageCount = (doc as any).internal.pages.length - 1;
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
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

    // Download file
    const fileName = `${options.fileName}.pdf`;
    downloadFile(blob, fileName);

    return {
      success: true,
      fileName,
      fileSize: blob.size,
      rowCount: exportData.length,
    };
  } catch (error) {
    return {
      success: false,
      fileName: options.fileName,
      rowCount: 0,
      error:
        error instanceof Error ? error.message : "Failed to export PDF",
    };
  }
}

/**
 * Main export function that delegates to format-specific exporters
 */
export function exportData<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): ExportResult {
  switch (options.format) {
    case "csv":
      return exportToCSV(data, options);
    case "excel":
      return exportToExcel(data, options);
    case "pdf":
      return exportToPDF(data, options);
    default:
      return {
        success: false,
        fileName: options.fileName,
        rowCount: 0,
        error: `Unsupported export format: ${options.format}`,
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
