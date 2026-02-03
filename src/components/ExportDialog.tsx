import { useState, useMemo, useEffect } from "react";
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
  Toggle,
  toast,
  DateRangePicker,
} from "@rafal.lemieszewski/tide-ui";
import type {
  ExportFormat,
  ExportDataScope,
  ExportOptions,
  ExportColumn,
  ExportDateRange,
} from "../types/export";
import { exportData, generateFileName, downloadFile } from "../utils/exportHelpers";
import { useExportNotifications } from "../hooks";

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
  const [fileName, _setFileName] = useState(generateFileName("fixtures_export"));
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  const [lastExportFileName, setLastExportFileName] = useState<string>("");
  const [columnSearch, setColumnSearch] = useState("");

  // Use export notifications hook
  const { createExportCallbacks } = useExportNotifications();

  // Initialize columns state with visible columns selected
  const [columns, setColumns] = useState<ExportColumn[]>(() =>
    availableColumns.map((col, index) => ({
      id: col.id,
      label: col.label,
      selected: visibleColumns.includes(col.id),
      order: index,
    }))
  );

  // Track if columns were manually modified by the user
  const [manuallyModified, setManuallyModified] = useState(false);

  // Auto-sync columns when bookmark or all scope is selected (unless manually modified)
  useEffect(() => {
    if ((dataScope === "bookmark" || dataScope === "all") && !manuallyModified) {
      setColumns(prev =>
        prev.map(col => ({
          ...col,
          selected: visibleColumns.includes(col.id)
        }))
      );
    }
  }, [dataScope, visibleColumns, manuallyModified]);

  // Reset manual modification flag when leaving bookmark scope
  useEffect(() => {
    if (dataScope !== "bookmark") {
      setManuallyModified(false);
    }
  }, [dataScope]);

  // Calculate data to export based on scope
  const dataToExport = useMemo(() => {
    if (dataScope === "filtered") return filteredData;
    if (dataScope === "bookmark") return bookmarkData;
    return data;
  }, [dataScope, filteredData, bookmarkData, data]);

  // Calculate selected column count
  const selectedColumnCount = columns.filter((col) => col.selected).length;

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    return columns.filter((col) =>
      col.label.toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [columns, columnSearch]);

  // Handle column selection toggle
  const handleColumnToggle = (columnId: string) => {
    setManuallyModified(true);
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, selected: !col.selected } : col
      )
    );
  };

  // Handle select all columns
  const handleSelectAll = () => {
    setManuallyModified(true);
    setColumns((prev) =>
      prev.map((col) => ({ ...col, selected: true }))
    );
  };

  // Handle deselect all columns
  const handleDeselectAll = () => {
    setManuallyModified(true);
    setColumns((prev) =>
      prev.map((col) => ({ ...col, selected: false }))
    );
  };

  // Handle reset to bookmark columns
  const handleResetToBookmark = () => {
    setManuallyModified(false);
    setColumns(prev =>
      prev.map(col => ({
        ...col,
        selected: visibleColumns.includes(col.id)
      }))
    );
  };

  // Handle export
  const handleExport = async () => {
    if (selectedColumnCount === 0) {
      toast.error("Please select at least one column to export");
      return;
    }

    setIsExporting(true);

    try {
      const retryDownload = () => {
        if (lastExportBlob && lastExportFileName) {
          downloadFile(lastExportBlob, lastExportFileName);
        }
      };

      const callbacks = createExportCallbacks(format, retryDownload);

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

      const result = await exportData(dataToExport, options, callbacks);

      if (result.success && result.blob) {
        // Store for potential retry
        setLastExportBlob(result.blob);
        setLastExportFileName(result.fileName);
        onClose();
      }
    } catch (error) {
      console.error("Export error:", error);
      // Error already handled by callbacks
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-lg max-h-[85vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>Export fixtures</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Format Selection */}
          <div className="flex flex-col gap-1">
            <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
              Format
            </Label>
            <div className="flex gap-2">
              <Toggle
                variant="outline"
                size="md"
                pressed={format === "csv"}
                onPressedChange={() => setFormat("csv")}
              >
                CSV
              </Toggle>
              <Toggle
                variant="outline"
                size="md"
                pressed={format === "excel"}
                onPressedChange={() => setFormat("excel")}
              >
                Excel
              </Toggle>
              <Toggle
                variant="outline"
                size="md"
                pressed={format === "pdf"}
                onPressedChange={() => setFormat("pdf")}
              >
                PDF
              </Toggle>
            </div>
          </div>

          <Separator className="bg-[var(--color-border-primary-subtle)]" />

          {/* Data Scope */}
          <div className="flex flex-col gap-1">
            <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
              Data to export
            </Label>
            <RadioGroup
              value={dataScope}
              onValueChange={(value) => setDataScope(value as ExportDataScope)}
              orientation="vertical"
              className="gap-1"
            >
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
            </RadioGroup>
          </div>

          <Separator className="bg-[var(--color-border-primary-subtle)]" />

          {/* Date Range Filter */}
          <div className="flex flex-col gap-1">
            <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
              Filter by last updated
            </Label>
            <RadioGroup
              value={dateRangeType}
              onValueChange={(value) => setDateRangeType(value as ExportDateRange)}
              orientation="vertical"
              className="gap-1"
            >
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
            </RadioGroup>

            {dateRangeType === "custom" && (
              <div className="ml-6 mt-2">
                <DateRangePicker
                  dateRange={{ from: dateFrom, to: dateTo }}
                  onDateRangeChange={(range) => {
                    setDateFrom(range.from);
                    setDateTo(range.to);
                  }}
                  placeholder="Select date range"
                />
              </div>
            )}
          </div>

          <Separator className="bg-[var(--color-border-primary-subtle)]" />

          {/* Column Selection */}
          <div className="flex flex-col gap-3">
            {/* Header with Label and Action Buttons */}
            <div className="flex items-center justify-between">
              <Label className="text-label-md font-medium text-[var(--color-text-primary)]">
                Columns
              </Label>
              <div className="flex gap-2">
                {dataScope !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToBookmark}
                    disabled={isExporting || !bookmarkName}
                  >
                    Reset to bookmark
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isExporting}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isExporting}
                >
                  Deselect all
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <Input
              type="search"
              placeholder="Search columns..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
            />

            {/* Scrollable Columns Container */}
            <div className="relative max-h-[200px] overflow-y-auto rounded-md border border-[var(--color-border-primary-subtle)] p-4">
              {filteredColumns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filteredColumns.map((column) => (
                    <Toggle
                      key={column.id}
                      pressed={column.selected}
                      onPressedChange={() => handleColumnToggle(column.id)}
                      variant="outline"
                      size="sm"
                    >
                      {column.label}
                    </Toggle>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-text-tertiary)] text-label-sm">
                  No columns found
                </div>
              )}
            </div>

            {/* Column Count Display */}
            <div className="text-label-sm text-[var(--color-text-tertiary)]">
              {selectedColumnCount} of {columns.length} columns selected
            </div>
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
