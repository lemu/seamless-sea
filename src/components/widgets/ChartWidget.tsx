import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon, Chart, createChartConfig, type ChartType, type ChartDataPoint, type ChartConfig as TideChartConfig } from "@rafal.lemieszewski/tide-ui";

interface ChartConfig {
  chartType: ChartType;
  dataSource?: string;
  xAxis?: string;
  yAxis?: string;
  title: string;
  data?: ChartDataPoint[];
  config?: TideChartConfig;
  // Add more chart-specific configuration as needed
}

export function ChartWidget({ config, onEdit, onDelete, onDuplicate, isEditable }: WidgetProps) {
  const renderChart = () => {
    if (!config.data || config.data.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Icon name="bar-chart-2" size="lg" className="mx-auto mb-2 text-[var(--color-text-tertiary)]" />
            <p className="text-body-sm font-medium text-[var(--color-text-primary)]">
              No data available
            </p>
          </div>
        </div>
      );
    }

    // Use provided config or create default based on chart type
    const chartConfig = config.config || createChartConfig([config.yAxis || "value"]);

    return (
      <div className="h-[200px] w-full">
        <Chart
          type={config.chartType}
          data={config.data}
          config={chartConfig}
          height={200}
          showGrid={true}
          showTooltip={true}
          responsive={true}
          colorScheme={config.chartType === "line" ? "line" : "bar"}
        />
      </div>
    );
  };

  return (
    <BaseWidget
      title={config.title}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      isEditable={isEditable}
    >
      <div className="flex-1 p-2">
        {renderChart()}
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
  data: undefined,
  config: undefined,
};