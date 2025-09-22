import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon } from "@rafal.lemieszewski/tide-ui";

interface TableConfig {
  dataSource?: string;
  columns: Array<{
    key: string;
    title: string;
    width?: number;
    sortable?: boolean;
    align?: "left" | "center" | "right";
  }>;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  title: string;
}

export function TableWidget({ config, onEdit, onDelete, onDuplicate, isEditable }: WidgetProps) {
  return (
    <BaseWidget
      title={config.title}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      isEditable={isEditable}
    >
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Icon name="table" size="lg" className="mx-auto mb-2 text-[var(--color-text-tertiary)]" />
          <p className="text-body-sm font-medium text-[var(--color-text-primary)]">
            Table Widget
          </p>
        </div>
      </div>
    </BaseWidget>
  );
}

// Default configuration for new table widgets
export const defaultTableConfig: Omit<TableConfig, "type"> = {
  title: "New Table",
  columns: [
    { key: "name", title: "Name", sortable: true },
    { key: "value", title: "Value", sortable: true, align: "right" },
    { key: "status", title: "Status", sortable: true },
  ],
  pageSize: 10,
  showPagination: true,
  showSearch: true,
};