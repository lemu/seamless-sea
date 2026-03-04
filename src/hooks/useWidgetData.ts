import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { WidgetSource } from "../types/widgets";

const utilizationConfig = {
  laden:   { label: "Laden days",   type: "bar"  as const, yAxisId: "left"  as const },
  ballast: { label: "Ballast days", type: "bar"  as const, yAxisId: "left"  as const },
  cargo:   { label: "Cargo (mt)",   type: "line" as const, yAxisId: "right" as const },
};

const speedDraftConfig = {
  laden:   { label: "Laden speed (kts)",   type: "line" as const, yAxisId: "left"  as const },
  ballast: { label: "Ballast speed (kts)", type: "line" as const, yAxisId: "left"  as const },
  draft:   { label: "Draft (m)",           type: "line" as const, yAxisId: "right" as const },
};

const speedBunkerConfig = {
  count:  { label: "Days",                 type: "bar"  as const, yAxisId: "left"  as const },
  bunker: { label: "Consumption (mt/day)", type: "line" as const, yAxisId: "right" as const },
};

type TideChartConfig = typeof utilizationConfig | typeof speedDraftConfig | typeof speedBunkerConfig;

export interface WidgetDataResult {
  data: Record<string, string | number>[];
  chartConfig: TideChartConfig | null;
  showRightYAxis: boolean;
  isLoading: boolean;
}

export function useWidgetData(source: WidgetSource | undefined): WidgetDataResult {
  const vesselId = source?.entityId as Id<"vessels"> | undefined;

  const sampleData = useQuery(
    api.vesselSampleData.getByVessel,
    vesselId ? { vesselId } : "skip"
  );

  if (!source) {
    return { data: [], chartConfig: null, showRightYAxis: false, isLoading: false };
  }

  const isLoading = sampleData === undefined;

  if (!sampleData) {
    return { data: [], chartConfig: null, showRightYAxis: false, isLoading };
  }

  switch (source.chartId) {
    case "vessel_report.utilization.laden_ballast_monthly": {
      const data = sampleData.monthlyStats.map((m) => ({
        name:    m.month,
        laden:   m.ladenDays,
        ballast: m.ballastDays,
        cargo:   m.cargoMt ?? 0,
      }));
      return { data, chartConfig: utilizationConfig, showRightYAxis: true, isLoading: false };
    }
    case "vessel_report.speed.draft_over_time": {
      const data = sampleData.weeklyPerformance.map((w) => ({
        name:    w.label,
        laden:   w.ladenSpeed,
        ballast: w.ballastSpeed,
        draft:   w.draft,
      }));
      return { data, chartConfig: speedDraftConfig, showRightYAxis: true, isLoading: false };
    }
    case "vessel_report.speed.distribution": {
      const data = sampleData.speedDistribution.map((b) => ({
        name:   b.bucket,
        count:  b.count,
        bunker: b.bunkerPerDay,
      }));
      return { data, chartConfig: speedBunkerConfig, showRightYAxis: true, isLoading: false };
    }
    default:
      return { data: [], chartConfig: null, showRightYAxis: false, isLoading: false };
  }
}
