import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon, Skeleton } from "@rafal.lemieszewski/tide-ui";
import { Chart } from "@rafal.lemieszewski/tide-ui/chart";
import { BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { WidgetSource, WidgetSizeConfig, WidgetSize } from "../../types/widgets";
import { WIDGET_SIZE_CONFIGS, getSizeFromRowsForConfigs } from "../../types/widgets";
import { useWidgetData } from "../../hooks/useWidgetData";

function getChartHeight(rows: number, sizeConfigs?: Partial<Record<WidgetSize, WidgetSizeConfig>>): number {
  const configs = sizeConfigs ?? WIDGET_SIZE_CONFIGS;
  const size = getSizeFromRowsForConfigs(rows, configs);
  return size && configs[size] ? configs[size]!.chartHeight : 160;
}

type ChartType = "bar" | "line" | "composed";

interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

interface ChartWidgetConfig {
  chartType: ChartType;
  dataSource?: string;
  xAxis?: string;
  yAxis?: string;
  title: string;
  data?: ChartDataPoint[];
  source?: WidgetSource;
}

function NoDataEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <Icon name={BarChart2} size="l" className="mx-auto mb-2 text-[var(--color-text-tertiary)]" />
        <p className="text-body-sm font-medium text-[var(--color-text-primary)]">
          No data available
        </p>
      </div>
    </div>
  );
}

function SourceChart({ config, chartHeight }: { config: ChartWidgetConfig; chartHeight: number }) {
  const { data, chartConfig, showRightYAxis, isLoading } = useWidgetData(config.source);

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col gap-2 p-2">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!chartConfig || data.length === 0) {
    return <NoDataEmptyState />;
  }

  return (
    <div className="w-full">
      <Chart
        type="composed"
        data={data}
        config={chartConfig}
        height={chartHeight}
        showLegend
        showRightYAxis={showRightYAxis}
        yAxisDomain={[0, "auto"]}
        rightYAxisDomain={[0, "auto"]}
      />
    </div>
  );
}

export function ChartWidget({ config, rows, onEdit, onDelete, onDuplicate, onResize, isEditable, sizeConfigs }: WidgetProps) {
  const chartConfig = config as unknown as ChartWidgetConfig;
  const chartHeight = getChartHeight(rows ?? 1, sizeConfigs);

  const renderChart = () => {
    if (chartConfig.source) {
      return <SourceChart config={chartConfig} chartHeight={chartHeight} />;
    }

    if (!chartConfig.data || chartConfig.data.length === 0) {
      return <NoDataEmptyState />;
    }

    const dataKey = chartConfig.yAxis || "value";

    return (
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartConfig.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary-subtle)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {chartConfig.chartType === "bar" ? (
              <Bar dataKey={dataKey} fill="var(--color-chart-bar-1)" />
            ) : (
              <Line dataKey={dataKey} stroke="var(--color-chart-line-1)" dot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <BaseWidget
      title={chartConfig.title}
      rows={rows}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onResize={onResize}
      isEditable={isEditable}
      sizeConfigs={sizeConfigs}
    >
      <div className="flex-1 p-4">
        {renderChart()}
      </div>
    </BaseWidget>
  );
}

export const defaultChartConfig: ChartWidgetConfig = {
  title: "New chart",
  chartType: "bar",
  dataSource: undefined,
  xAxis: undefined,
  yAxis: undefined,
  data: undefined,
};
