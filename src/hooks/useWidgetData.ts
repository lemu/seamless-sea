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

// ── Port chart configs ────────────────────────────────────────────────────────

const vesselsByTypeConfig = {
  count: { label: "Vessels", type: "bar" as const, yAxisId: "left" as const },
};
const arrivalsByDayConfig = {
  value: { label: "Arrivals", type: "bar" as const, yAxisId: "left" as const },
};
const topOriginConfig = {
  count: { label: "Calls", type: "bar" as const, yAxisId: "left" as const },
};
const portCallsConfig = {
  calls: { label: "Port calls", type: "bar" as const, yAxisId: "left" as const },
};
const cargoVolumeConfig = {
  volume: { label: "Volume (mt m)", type: "line" as const, yAxisId: "left" as const },
};
const callsByTypeConfig = {
  count: { label: "Calls", type: "bar" as const, yAxisId: "left" as const },
};
const topCommoditiesConfig = {
  volume: { label: "Volume (mt m)", type: "bar" as const, yAxisId: "left" as const },
};
const waitTrendConfig = {
  days: { label: "Avg wait (days)", type: "line" as const, yAxisId: "left" as const },
};
const anchorageByDayConfig = {
  value: { label: "Vessels at anchor", type: "bar" as const, yAxisId: "left" as const },
};
const waitDistConfig = {
  lt1:   { label: "<1 day",   type: "bar" as const, yAxisId: "left" as const },
  d1to3: { label: "1–3 days", type: "bar" as const, yAxisId: "left" as const },
  d3to7: { label: "3–7 days", type: "bar" as const, yAxisId: "left" as const },
  gt7:   { label: ">7 days",  type: "bar" as const, yAxisId: "left" as const },
};
const avgWaitByTypeConfig = {
  days: { label: "Avg wait (days)", type: "bar" as const, yAxisId: "left" as const },
};

type TideChartConfig = Record<string, { label: string; type?: "bar" | "line" | "area" | "range-area"; yAxisId?: "left" | "right" }>;

export interface WidgetDataResult {
  data: Record<string, string | number>[];
  chartConfig: TideChartConfig | null;
  showRightYAxis: boolean;
  isLoading: boolean;
}

export function useWidgetData(source: WidgetSource | undefined): WidgetDataResult {
  const isVesselChart = source?.section === "vessel_report";
  const vesselId = isVesselChart ? (source?.entityId as Id<"vessels"> | undefined) : undefined;

  const portId = source?.section === "port_report"
    ? source.entityId as Id<"ports"> | undefined
    : undefined;

  const vesselSampleData = useQuery(
    api.vesselSampleData.getByVessel,
    vesselId ? { vesselId } : "skip"
  );

  const portSampleData = useQuery(
    api.portSampleData.getByPort,
    portId ? { portId } : "skip"
  );

  if (!source) {
    return { data: [], chartConfig: null, showRightYAxis: false, isLoading: false };
  }

  const isLoading = source.section === "port_report"
    ? portSampleData === undefined
    : vesselSampleData === undefined;

  if (source.section === "port_report") {
    if (!portSampleData) {
      return { data: [], chartConfig: null, showRightYAxis: false, isLoading };
    }

    switch (source.chartId) {
      case "port_report.activity.vessels_by_type": {
        const data = portSampleData.vesselsByType.map((v) => ({ name: v.name, count: v.count }));
        return { data, chartConfig: vesselsByTypeConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.activity.arrivals_by_day": {
        const data = portSampleData.arrivalsByDay.map((v, i) => ({ name: `D${i + 1}`, value: v }));
        return { data, chartConfig: arrivalsByDayConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.activity.top_origin_ports": {
        const data = portSampleData.topOriginPorts.map((v) => ({ name: v.name, count: v.count }));
        return { data, chartConfig: topOriginConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.calls.monthly": {
        const data = portSampleData.portCallsByMonth.map((m) => ({ name: m.month, calls: m.calls }));
        return { data, chartConfig: portCallsConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.calls.cargo_volume": {
        const data = portSampleData.cargoVolumeByMonth.map((m) => ({ name: m.month, volume: m.volume }));
        return { data, chartConfig: cargoVolumeConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.calls.by_vessel_type": {
        const data = portSampleData.callsByVesselType.map((v) => ({ name: v.name, count: v.count }));
        return { data, chartConfig: callsByTypeConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.calls.top_commodities": {
        const data = portSampleData.topCommodities.map((v) => ({ name: v.name, volume: v.volume }));
        return { data, chartConfig: topCommoditiesConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.congestion.wait_trend": {
        const data = portSampleData.waitingTimeTrend.map((m) => ({ name: m.month, days: m.days }));
        return { data, chartConfig: waitTrendConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.congestion.anchorage_by_day": {
        const data = portSampleData.anchorageByDay.map((v, i) => ({ name: `D${i + 1}`, value: v }));
        return { data, chartConfig: anchorageByDayConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.congestion.wait_distribution": {
        const data = portSampleData.waitDistribution.map((m) => ({
          name: m.month, lt1: m.lt1, d1to3: m.d1to3, d3to7: m.d3to7, gt7: m.gt7,
        }));
        return { data, chartConfig: waitDistConfig, showRightYAxis: false, isLoading: false };
      }
      case "port_report.congestion.avg_wait_by_type": {
        const data = portSampleData.avgWaitByType.map((v) => ({ name: v.name, days: v.days }));
        return { data, chartConfig: avgWaitByTypeConfig, showRightYAxis: false, isLoading: false };
      }
      default:
        return { data: [], chartConfig: null, showRightYAxis: false, isLoading: false };
    }
  }

  if (!vesselSampleData) {
    return { data: [], chartConfig: null, showRightYAxis: false, isLoading };
  }

  switch (source.chartId) {
    case "vessel_report.utilization.laden_ballast_monthly": {
      const data = vesselSampleData.monthlyStats.map((m) => ({
        name:    m.month,
        laden:   m.ladenDays,
        ballast: m.ballastDays,
        cargo:   m.cargoMt ?? 0,
      }));
      return { data, chartConfig: utilizationConfig, showRightYAxis: true, isLoading: false };
    }
    case "vessel_report.speed.draft_over_time": {
      const data = vesselSampleData.weeklyPerformance.map((w) => ({
        name:    w.label,
        laden:   w.ladenSpeed,
        ballast: w.ballastSpeed,
        draft:   w.draft,
      }));
      return { data, chartConfig: speedDraftConfig, showRightYAxis: true, isLoading: false };
    }
    case "vessel_report.speed.distribution": {
      const data = vesselSampleData.speedDistribution.map((b) => ({
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
