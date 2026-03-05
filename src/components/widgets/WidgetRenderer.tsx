import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { ChartWidget } from "./ChartWidget";
import { TableWidget } from "./TableWidget";
import { EmptyWidget } from "./EmptyWidget";
import { NewsTickerWidget } from "../news/NewsTickerWidget";
import type { WidgetDocument, WidgetSize } from "../../types/widgets";
import { getWidgetSizeConfigs } from "../../types/widgets";
import { getChartById } from "../../data/chartRegistry";

interface WidgetRendererProps {
  widget: WidgetDocument;
  rows?: number;
  isEditable?: boolean;
  onEdit?: (widgetId: string) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widgetId: string) => void;
  onResize?: (widgetId: string, size: WidgetSize) => void;
}

export function WidgetRenderer({
  widget,
  rows,
  isEditable = true,
  onEdit,
  onDelete,
  onDuplicate,
  onResize,
}: WidgetRendererProps) {
  const registryEntry = widget.config.source ? getChartById(widget.config.source.chartId) : undefined;
  const effectiveChartType = registryEntry?.defaultChartType ?? widget.config.chartType;
  const sizeConfigs = getWidgetSizeConfigs(effectiveChartType, widget.type);

  // Common props for all widgets
  const commonProps: WidgetProps = {
    config: {
      ...widget.config,
      type: widget.type,
      title: widget.title, // Override any title in config
    },
    rows,
    isEditable,
    onEdit: onEdit ? () => onEdit(widget._id) : undefined,
    onDelete: onDelete ? () => onDelete(widget._id) : undefined,
    onDuplicate: onDuplicate ? () => onDuplicate(widget._id) : undefined,
    onResize: onResize ? (size) => onResize(widget._id, size) : undefined,
    sizeConfigs,
  };


  // Render appropriate widget component based on type
  const renderWidgetContent = () => {
    switch (widget.type) {
      case "chart":
        return <ChartWidget {...commonProps} />;
      
      case "table":
        return <TableWidget {...commonProps} />;
      
      case "empty":
        return <EmptyWidget {...commonProps} />;

      case "news_ticker":
        return <NewsTickerWidget {...commonProps} />;

      default:
        // Fallback for unknown widget types
        return (
          <BaseWidget
            title={widget.title}
            isEditable={isEditable}
            error={`Unknown widget type: ${widget.type}`}
          >
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="text-center">
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  This widget type is not supported.
                </p>
              </div>
            </div>
          </BaseWidget>
        );
    }
  };

  return (
    <div className="h-full w-full relative">
      {renderWidgetContent()}
    </div>
  );
}