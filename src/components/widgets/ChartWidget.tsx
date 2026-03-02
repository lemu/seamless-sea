import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon } from "@rafal.lemieszewski/tide-ui";
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
}

export function ChartWidget({ config, onEdit, onDelete, onDuplicate, isEditable }: WidgetProps) {
  const chartConfig = config as unknown as ChartWidgetConfig;

  const renderChart = () => {
    if (!chartConfig.data || chartConfig.data.length === 0) {
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

    const dataKey = chartConfig.yAxis || "value";

    return (
      <div className="h-[200px] w-full">
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

export const defaultChartConfig: ChartWidgetConfig = {
  title: "New chart",
  chartType: "bar",
  dataSource: undefined,
  xAxis: undefined,
  yAxis: undefined,
  data: undefined,
};
