import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon } from "@rafal.lemieszewski/tide-ui";

interface ChartConfig {
  chartType: "line" | "bar" | "pie" | "area";
  dataSource?: string;
  xAxis?: string;
  yAxis?: string;
  title: string;
  // Add more chart-specific configuration as needed
}

export function ChartWidget({ config, onEdit, onDelete, onDuplicate, isEditable }: WidgetProps) {
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
          <Icon name="bar-chart-2" size="lg" className="mx-auto mb-2 text-[var(--color-text-tertiary)]" />
          <p className="text-body-sm font-medium text-[var(--color-text-primary)]">
            Chart Widget
          </p>
        </div>
      </div>
    </BaseWidget>
  );
}

// Default configuration for new chart widgets
export const defaultChartConfig: Omit<ChartConfig, "type"> = {
  title: "New Chart",
  chartType: "bar",
  dataSource: undefined,
  xAxis: undefined,
  yAxis: undefined,
};