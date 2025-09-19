import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { ChartWidget } from "./ChartWidget";
import { TableWidget } from "./TableWidget";
import { EmptyWidget } from "./EmptyWidget";
import type { Id } from "../../../convex/_generated/dataModel";

interface WidgetRendererProps {
  widget: {
    _id: Id<"widgets">;
    boardId: Id<"boards">;
    type: "chart" | "table" | "empty";
    title: string;
    config: any;
    createdAt: number;
    updatedAt: number;
  };
  isEditable?: boolean;
  onEdit?: (widgetId: string) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widgetId: string) => void;
}

export function WidgetRenderer({ 
  widget, 
  isEditable = true,
  onEdit,
  onDelete,
  onDuplicate,
}: WidgetRendererProps) {
  // Common props for all widgets
  const commonProps: WidgetProps = {
    config: {
      type: widget.type,
      title: widget.title,
      ...widget.config,
    },
    isEditable,
    onEdit: onEdit ? () => onEdit(widget._id) : undefined,
    onDelete: onDelete ? () => onDelete(widget._id) : undefined,
    onDuplicate: onDuplicate ? () => onDuplicate(widget._id) : undefined,
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