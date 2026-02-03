import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon, Chart, createChartConfig, type ChartType, type ChartDataPoint, type ChartConfig as TideChartConfig } from "@rafal.lemieszewski/tide-ui";

interface ChartWidgetConfig {
  chartType: ChartType;
  dataSource?: string;
  xAxis?: string;
  yAxis?: string;
  title: string;
  data?: ChartDataPoint[];
  config?: TideChartConfig;
}

export function ChartWidget({ config, onEdit, onDelete, onDuplicate, isEditable }: WidgetProps) {
  // Cast config to chart-specific type
  const chartConfig = config as unknown as ChartWidgetConfig;

  const renderChart = () => {
    if (!chartConfig.data || chartConfig.data.length === 0) {
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
    const tideConfig = chartConfig.config || createChartConfig([chartConfig.yAxis || "value"]);

    return (
      <div className="h-[200px] w-full">
        <Chart
          type={chartConfig.chartType}
          data={chartConfig.data}
          config={tideConfig}
          height={200}
          showGrid={true}
          showTooltip={true}
          responsive={true}
          colorScheme={chartConfig.chartType === "line" ? "line" : "bar"}
        />
      </div>
    );
  };

  return (
    <BaseWidget
      title={chartConfig.title}
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
export const defaultChartConfig: ChartWidgetConfig = {
  title: "New chart",
  chartType: "bar",
  dataSource: undefined,
  xAxis: undefined,
  yAxis: undefined,
  data: undefined,
  config: undefined,
};