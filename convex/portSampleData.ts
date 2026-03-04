import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByPort = query({
  args: { portId: v.id("ports") },
  handler: async (ctx, { portId }) =>
    ctx.db
      .query("port_sample_data")
      .withIndex("by_port", (q) => q.eq("portId", portId))
      .first(),
});

// Seed mutation — idempotent, skips ports that already have a document
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const ports = await ctx.db.query("ports").collect();

    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const vesselTypes = ["Bulk Carrier", "Tanker", "Container", "LNG/LPG", "General Cargo", "Other"];
    const originPorts = [
      "Tubarao", "Port Hedland", "Dampier", "Richards Bay", "Rotterdam",
      "Singapore", "Shanghai", "Houston", "Busan", "Port Said",
    ];
    const commodities = ["Iron Ore", "Coal", "Crude Oil", "Containers (TEU)", "Grain", "LNG", "Fertiliser"];
    const vesselNames = [
      "Vale Brazil", "BW Courage", "MSC Oscar", "Pacific Titan", "Nordic Crown",
      "Iron Odyssey", "Star Omega", "Bulk Atlantic", "Coral Sky", "Perseus",
      "Cape Endeavour", "Orient Express", "Silver Sea", "Arctic Dawn", "Phoenix",
    ];
    const imoBase = 9200000;
    const statuses = ["Berth", "Anchorage", "Waiting"] as const;
    const arrivedDates = [
      "2 Jan 2025", "8 Jan 2025", "15 Jan 2025", "22 Jan 2025", "29 Jan 2025",
      "5 Feb 2025", "12 Feb 2025", "19 Feb 2025", "26 Feb 2025", "5 Mar 2025",
      "12 Mar 2025", "19 Mar 2025", "26 Mar 2025", "2 Apr 2025", "9 Apr 2025",
    ];
    const etaDates = [
      "5 Jan 2025", "12 Jan 2025", "19 Jan 2025", "26 Jan 2025", "2 Feb 2025",
      "9 Feb 2025", "16 Feb 2025", "23 Feb 2025", "2 Mar 2025", "9 Mar 2025",
      "16 Mar 2025", "23 Mar 2025", "30 Mar 2025", "6 Apr 2025", "13 Apr 2025",
    ];
    const cargoes = ["Iron Ore", "Coal", "Crude Oil", "Containers", "Grain", "LNG", "Fertiliser", "—"];

    let seeded = 0;

    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      const existing = await ctx.db
        .query("port_sample_data")
        .withIndex("by_port", (q) => q.eq("portId", port._id))
        .first();
      if (existing) continue;

      // Variation offsets
      const o = i % 5;   // 0–4
      const isBulkHeavy = ["Tubarao", "Port Hedland", "Dampier", "Richards Bay", "Paradip"].includes(port.name);
      const isContainerHeavy = ["Busan", "Hong Kong", "Los Angeles", "Shanghai", "Singapore"].includes(port.name);
      const isMiddleEast = ["Dubai (Jebel Ali)", "Houston"].includes(port.name);

      // Sidebar live stats
      const inPortBase = isBulkHeavy ? 8 + o : isContainerHeavy ? 40 + o * 3 : 20 + o * 2;
      const inPort = inPortBase;
      const inAnchorage = isBulkHeavy ? 4 + o : isContainerHeavy ? 10 + o : 6 + o;
      const destined = inPort + inAnchorage + 5 + o;
      const avgTurnaround = isBulkHeavy ? 4.5 + o * 0.3 : 1.8 + o * 0.2;
      const totalDWT = Math.round((inPort * (isBulkHeavy ? 280000 : 120000)) / 1_000_000 * 10) / 10;

      // Tab 1 — vesselsByType
      const bulkShare = isBulkHeavy ? 0.7 : isContainerHeavy ? 0.05 : 0.3;
      const containerShare = isContainerHeavy ? 0.65 : isBulkHeavy ? 0.02 : 0.15;
      const tankerShare = isMiddleEast ? 0.45 : 0.15;
      const vesselsByType = vesselTypes.map((name) => {
        let share = 0.1;
        if (name === "Bulk Carrier") share = bulkShare;
        else if (name === "Container") share = containerShare;
        else if (name === "Tanker") share = tankerShare;
        else if (name === "LNG/LPG") share = isMiddleEast ? 0.15 : 0.05;
        else if (name === "General Cargo") share = 0.08;
        return { name, count: Math.max(1, Math.round(inPort * share)) };
      });

      // topOriginPorts
      const topOriginPorts = originPorts
        .filter((p) => p !== port.name)
        .slice(0, 6)
        .map((name, k) => ({ name, count: Math.max(2, 20 - k * 3 + o) }));

      // arrivalsByDay — 30 values
      const arrivalsByDay = Array.from({ length: 30 }, (_, k) => {
        const base = isBulkHeavy ? 2 : isContainerHeavy ? 8 : 4;
        return Math.max(0, base + Math.round(Math.sin(k * 0.4 + o) * (base * 0.5)));
      });

      // vesselsInPort table
      const numVessels = Math.min(8, inPort);
      const vesselsInPort = Array.from({ length: numVessels }, (_, k) => {
        const nameIdx = (i * 3 + k) % vesselNames.length;
        const typeIdx = k % vesselTypes.length;
        const statusIdx = k < Math.floor(numVessels * 0.6) ? 0 : k < Math.floor(numVessels * 0.85) ? 1 : 2;
        return {
          vessel: vesselNames[nameIdx],
          imo: String(imoBase + i * 100 + k),
          type: vesselTypes[typeIdx],
          dwt: isBulkHeavy ? 200000 + k * 15000 : 50000 + k * 10000,
          status: statuses[statusIdx],
          arrived: arrivedDates[(i + k) % arrivedDates.length],
          etaDeparture: etaDates[(i + k + 2) % etaDates.length],
          cargo: cargoes[(i + k) % cargoes.length],
        };
      });

      // Tab 2 — portCallsByMonth
      const callsBase = isBulkHeavy ? 30 : isContainerHeavy ? 120 : 60;
      const portCallsByMonth = months.map((month, k) => ({
        month,
        calls: Math.max(5, callsBase + Math.round(Math.sin(k * 0.5 + o) * (callsBase * 0.2))),
      }));

      // cargoVolumeByMonth (mt millions)
      const volBase = isBulkHeavy ? 8 : isContainerHeavy ? 2 : 4;
      const cargoVolumeByMonth = months.map((month, k) => ({
        month,
        volume: Math.max(0.5, Math.round((volBase + Math.sin(k * 0.5 + o) * (volBase * 0.25)) * 10) / 10),
      }));

      // callsByVesselType
      const callsByVesselType = vesselsByType.map((vt) => ({
        name: vt.name,
        count: Math.round(vt.count * callsBase / inPort),
      }));

      // topCommodities
      const topCommodities = commodities.slice(0, 5).map((name, k) => ({
        name,
        volume: Math.max(0.1, Math.round((volBase * (1 - k * 0.15) + o * 0.2) * 10) / 10),
      }));

      // portCallsHistory (last 8 calls)
      const portCallsHistory = Array.from({ length: 8 }, (_, k) => {
        const nameIdx = (i * 2 + k + 3) % vesselNames.length;
        const typeIdx = k % vesselTypes.length;
        const arrIdx = (i + k) % arrivedDates.length;
        const depIdx = (i + k + 2) % arrivedDates.length;
        const stayDays = isBulkHeavy ? 3 + k % 3 : 1 + k % 2;
        return {
          vessel: vesselNames[nameIdx],
          type: vesselTypes[typeIdx],
          arrived: arrivedDates[arrIdx],
          departed: arrivedDates[depIdx],
          cargo: cargoes[(i + k + 1) % (cargoes.length - 1)],
          volume: Math.round((isBulkHeavy ? 180000 + k * 5000 : 50000 + k * 3000) / 1000) / 100,
          stay: stayDays,
        };
      });

      const portCallsYTD = portCallsByMonth.reduce((s, m) => s + m.calls, 0);
      const avgCallsPerMonth = Math.round(portCallsYTD / 12);
      const avgPortStay = Math.round(avgTurnaround * 10) / 10;
      const volumeYTD = Math.round(cargoVolumeByMonth.reduce((s, m) => s + m.volume, 0) * 10) / 10;

      // Tab 3 — Congestion
      const avgWait = isBulkHeavy ? 3.5 + o * 0.4 : 0.8 + o * 0.2;
      const maxWait = isBulkHeavy ? 12 + o : 4 + o;
      const expectedThisWeek = inAnchorage + 2 + o;

      const waitingTimeTrend = months.map((month, k) => ({
        month,
        days: Math.max(0.5, Math.round((avgWait + Math.sin(k * 0.6 + o) * avgWait * 0.4) * 10) / 10),
      }));

      const anchorageByDay = Array.from({ length: 30 }, (_, k) => {
        const base = inAnchorage;
        return Math.max(0, Math.round(base + Math.sin(k * 0.5 + o) * (base * 0.4)));
      });

      const waitDistribution = months.map((month, k) => {
        const total = Math.max(4, inAnchorage + Math.round(Math.sin(k * 0.4 + o) * 2));
        const gt7Frac = isBulkHeavy ? 0.25 : 0.05;
        const d3to7Frac = isBulkHeavy ? 0.3 : 0.1;
        const d1to3Frac = 0.35;
        const gt7 = Math.max(0, Math.round(total * gt7Frac));
        const d3to7 = Math.max(0, Math.round(total * d3to7Frac));
        const d1to3 = Math.max(0, Math.round(total * d1to3Frac));
        const lt1 = Math.max(0, total - gt7 - d3to7 - d1to3);
        return { month, lt1, d1to3, d3to7, gt7 };
      });

      const avgWaitByType = vesselTypes.map((name, k) => ({
        name,
        days: Math.max(0.3, Math.round((avgWait + k * 0.3 - o * 0.1) * 10) / 10),
      }));

      const numCongestion = Math.min(6, inAnchorage + 1);
      const vesselsCongestion = Array.from({ length: numCongestion }, (_, k) => {
        const nameIdx = (i + k + 5) % vesselNames.length;
        const typeIdx = k % vesselTypes.length;
        const daysWaiting = Math.max(1, Math.round(avgWait + k * 0.5));
        return {
          vessel: vesselNames[nameIdx],
          type: vesselTypes[typeIdx],
          dwt: isBulkHeavy ? 180000 + k * 20000 : 60000 + k * 10000,
          arrivedAnchorage: arrivedDates[(i + k + 7) % arrivedDates.length],
          waitSoFar: `${daysWaiting}d ${k % 12}h`,
          expectedBerth: etaDates[(i + k + 3) % etaDates.length],
          cargo: cargoes[(i + k + 2) % (cargoes.length - 1)],
        };
      });

      await ctx.db.insert("port_sample_data", {
        portId: port._id,
        inPort,
        inAnchorage,
        destined,
        avgTurnaround: Math.round(avgTurnaround * 10) / 10,
        totalDWT,
        vesselsByType,
        topOriginPorts,
        arrivalsByDay,
        vesselsInPort,
        portCallsByMonth,
        cargoVolumeByMonth,
        callsByVesselType,
        topCommodities,
        portCallsHistory,
        portCallsYTD,
        avgCallsPerMonth,
        avgPortStay,
        volumeYTD,
        avgWait: Math.round(avgWait * 10) / 10,
        maxWait,
        expectedThisWeek,
        waitingTimeTrend,
        anchorageByDay,
        waitDistribution,
        avgWaitByType,
        vesselsCongestion,
      });

      seeded++;
    }

    return { seeded, total: ports.length };
  },
});
