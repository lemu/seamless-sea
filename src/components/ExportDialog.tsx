import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  Button,
  RadioGroup,
  RadioGroupItem,
  Input,
  Label,
  Separator,
  Icon,
} from "@rafal.lemieszewski/tide-ui";
import type {
  ExportFormat,
  ExportDataScope,
  ExportOptions,
  ExportColumn,
  ExportDateRange,
} from "../types/export";
import { exportData, generateFileName } from "../utils/exportHelpers";
import { cn } from "../lib/utils";

interface ExportDialogProps<T extends Record<string, any>> {
  open: boolean;
  onClose: () => void;
  data: T[];
  filteredData: T[];
  bookmarkData: T[];
  availableColumns: Array<{ id: string; label: string }>;
  visibleColumns: string[];
  isDirty: boolean;
  bookmarkName?: string;
}

export function ExportDialog<T extends Record<string, any>>({
  open,
  onClose,
  data,
  filteredData,
  bookmarkData,
  availableColumns,
  visibleColumns,
  isDirty,
  bookmarkName,
}: ExportDialogProps<T>) {
  // State for export options
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [dataScope, setDataScope] = useState<ExportDataScope>("all");
  const [dateRangeType, setDateRangeType] = useState<ExportDateRange>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [fileName, setFileName] = useState(generateFileName("fixtures_export"));
  const [isExporting, setIsExporting] = useState(false);

  // Initialize columns state with visible columns selected
  const [columns, setColumns] = useState<ExportColumn[]>(() =>
    availableColumns.map((col, index) => ({
      id: col.id,
      label: col.label,
      selected: visibleColumns.includes(col.id),
      order: index,
    }))
  );

  // Calculate data to export based on scope
  const dataToExport = useMemo(() => {
    if (dataScope === "filtered") return filteredData;
    if (dataScope === "bookmark") return bookmarkData;
    return data;
  }, [dataScope, filteredData, bookmarkData, data]);

  // Calculate selected column count
  const selectedColumnCount = columns.filter((col) => col.selected).length;

  // Handle select all columns
  const handleSelectAll = () => {
    setColumns((prev) =>
      prev.map((col) => ({ ...col, selected: true }))
    );
  };

  // Handle clear all columns
  const handleClearAll = () => {
    setColumns((prev) =>
      prev.map((col) => ({ ...col, selected: false }))
    );
  };

  // Handle column selection toggle
  const handleColumnToggle = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, selected: !col.selected } : col
      )
    );
  };

  // Handle export
  const handleExport = async () => {
    if (selectedColumnCount === 0) {
      alert("Please select at least one column to export");
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        format,
        dataScope,
        columns,
        dateRange: {
          type: dateRangeType,
          from: dateFrom,
          to: dateTo,
        },
        fileName,
        excel: {
          freezeHeader: true,
          autoFitColumns: true,
          splitByGroup: false,
        },
        pdf: {
          orientation: "landscape",
          pageSize: "a4",
          includePageNumbers: true,
        },
      };

      const result = exportData(dataToExport, options);

      if (result.success) {
        onClose();
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Fixtures</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
              Format
            </Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="csv" id="format-csv" />
                  <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer">
                    <Icon name="file-text" size="sm" />
                    CSV
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="excel" id="format-excel" />
                  <Label htmlFor="format-excel" className="flex items-center gap-2 cursor-pointer">
                    <Icon name="file-spreadsheet" size="sm" />
                    Excel
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="pdf" id="format-pdf" />
                  <Label htmlFor="format-pdf" className="flex items-center gap-2 cursor-pointer">
                    <Icon name="file" size="sm" />
                    PDF
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Data Scope */}
          <div className="space-y-2">
            <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
              Data to export
            </Label>
            <RadioGroup
              value={dataScope}
              onValueChange={(value) => setDataScope(value as ExportDataScope)}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="cursor-pointer">
                    All data ({data.length} fixtures)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bookmark" id="scope-bookmark" />
                  <Label htmlFor="scope-bookmark" className="cursor-pointer">
                    Current bookmark{bookmarkName ? `: ${bookmarkName}` : ""} ({bookmarkData.length} fixtures)
                  </Label>
                </div>
                {isDirty && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="filtered" id="scope-filtered" />
                    <Label htmlFor="scope-filtered" className="cursor-pointer">
                      Current filter ({filteredData.length} fixtures)
                    </Label>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
              Filter by Last Updated
            </Label>
            <RadioGroup
              value={dateRangeType}
              onValueChange={(value) => setDateRangeType(value as ExportDateRange)}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="date-all" />
                  <Label htmlFor="date-all" className="cursor-pointer">
                    All time
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="date-custom" />
                  <Label htmlFor="date-custom" className="cursor-pointer">
                    Custom range
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {dateRangeType === "custom" && (
              <div className="ml-6 mt-2 flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="date-from" className="text-label-sm">
                    From
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="date-to" className="text-label-sm">
                    To
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Column Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
                Columns ({selectedColumnCount} selected)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-[var(--color-text-secondary)]"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-[var(--color-text-secondary)]"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {columns.map((column) => (
                <button
                  key={column.id}
                  onClick={() => handleColumnToggle(column.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-body-sm cursor-pointer transition-colors",
                    column.selected
                      ? "bg-[var(--color-bg-interactive-selected)] text-[var(--color-text-interactive-selected)]"
                      : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary-hover)]"
                  )}
                >
                  {column.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="file-name" className="text-label-md font-medium text-[var(--color-text-primary)]">
              File name
            </Label>
            <Input
              id="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={isExporting || selectedColumnCount === 0}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
