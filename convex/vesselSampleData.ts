import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByVessel = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, { vesselId }) =>
    ctx.db
      .query("vessel_sample_data")
      .withIndex("by_vessel", (q) => q.eq("vesselId", vesselId))
      .first(),
});

// Seed mutation — idempotent, skips vessels that already have a document
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const vessels = await ctx.db.query("vessels").collect();

    const loadPorts = ["Tubarao", "Dampier", "Narvik", "Port Hedland", "Richards Bay", "Saldanha Bay"];
    const dischPorts = ["Qingdao", "Rotterdam", "Zhoushan", "Beilun", "Caofeidian", "Taranto"];
    const portNames = ["Tubarao", "Dampier", "Rotterdam", "Qingdao", "Narvik", "Cape Town", "Singapore", "Port Hedland"];
    const portCountries = ["Brazil", "Australia", "Netherlands", "China", "Norway", "South Africa", "Singapore", "Australia"];
    const activities = ["Load", "Discharge", "Bunker"] as const;
    const berths = ["B1", "B2", "B3", "EMO Terminal", "Ore Quay", "Anchorage", "Q3", "Iron Ore Berth"];
    const cargoes = ["Iron Ore", "Iron Ore Pellets", "Coal", "Bauxite", "—"];
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const speedBuckets = ["<8 kts", "9 kts", "11 kts", "13 kts", ">14 kts"];
    const arrivedDates = [
      "12 Jan 2025", "28 Jan 2025", "18 Feb 2025", "3 Mar 2025", "28 Mar 2025", "14 Apr 2025",
      "5 Feb 2025", "20 Feb 2025", "8 Mar 2025", "25 Mar 2025", "10 Apr 2025", "30 Apr 2025",
      "15 Jan 2025", "2 Feb 2025", "22 Feb 2025", "12 Mar 2025", "5 Apr 2025", "20 Apr 2025",
    ];
    const departedDates = [
      "16 Jan 2025", "29 Jan 2025", "22 Feb 2025", "6 Mar 2025", "29 Mar 2025", "19 Apr 2025",
      "9 Feb 2025", "24 Feb 2025", "12 Mar 2025", "28 Mar 2025", "14 Apr 2025", "3 May 2025",
      "19 Jan 2025", "6 Feb 2025", "26 Feb 2025", "15 Mar 2025", "8 Apr 2025", "24 Apr 2025",
    ];

    let seeded = 0;

    for (let i = 0; i < vessels.length; i++) {
      const vessel = vessels[i];
      const existing = await ctx.db
        .query("vessel_sample_data")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .first();
      if (existing) continue;

      const o = i % 3; // variation offset 0–2

      // 6 port calls
      const portCalls = Array.from({ length: 6 }, (_, k) => {
        const portIdx = (i + k * 2 + o) % portNames.length;
        const dateBase = i * 18 + k * 3;
        return {
          country: portCountries[portIdx],
          port: portNames[portIdx],
          activity: activities[k % 3],
          arrived: arrivedDates[dateBase % arrivedDates.length],
          departed: departedDates[dateBase % departedDates.length],
          berth: berths[(portIdx + k) % berths.length],
          cargo: k % 3 === 2 ? "—" : cargoes[(i + k) % (cargoes.length - 1)],
        };
      });

      // 5 voyages
      const voyages = Array.from({ length: 5 }, (_, k) => {
        const lpIdx = (i + k + o) % loadPorts.length;
        const dpIdx = (i + k + o + 2) % dischPorts.length;
        const baseCargo = 165000 + (i % 5) * 1500 + k * 1000;
        const baseLaden = 20 + (o * 2) + k;
        const baseBallast = 10 + o + (k % 3);
        const ladenSpd = 11.8 + (o * 0.2) + (k % 3) * 0.3;
        const ballastSpd = 10.4 + (o * 0.2) + (k % 3) * 0.2;
        const avgDraft = 17.8 + (o * 0.2) + (k % 3) * 0.2;
        const bunker = 4700 + o * 150 + k * 100;
        return {
          voyage: `V00${k + 1}`,
          loadPort: loadPorts[lpIdx],
          dischPort: dischPorts[dpIdx],
          ladenDays: baseLaden,
          ballastDays: baseBallast,
          cargoMt: baseCargo,
          avgLadenSpeed: Math.round(ladenSpd * 10) / 10,
          avgBallastSpeed: Math.round(ballastSpd * 10) / 10,
          avgDraft: Math.round(avgDraft * 10) / 10,
          bunkerMt: bunker,
        };
      });

      // 6 monthly stats
      const monthlyStats = months.map((month, k) => ({
        month,
        ladenDays: 17 + (o * 2) + (k % 3),
        ballastDays: 9 + o + (k % 2),
        cargoMt: k % 4 === 3 ? 0 : 160000 + (i % 5) * 1500 + (o * 2000) + (k % 3) * 3000,
      }));

      // 12 weekly performance points
      const weeklyPerformance = Array.from({ length: 12 }, (_, k) => ({
        label: `Wk ${k + 1}`,
        ladenSpeed: Math.round((11.5 + Math.sin(k * 0.5 + o) * 1.2) * 10) / 10,
        ballastSpeed: Math.round((10.2 + Math.cos(k * 0.4 + o) * 0.9) * 10) / 10,
        draft: Math.round((14 + Math.sin(k * 0.6 + o) * 3.5) * 10) / 10,
      }));

      // 5 speed distribution buckets
      const speedDistribution = speedBuckets.map((bucket, k) => ({
        bucket,
        count: [12, 28, 45, 38, 8][k] + (o * 3) - (k === 2 ? o * 2 : 0),
        bunkerPerDay: [18, 32, 48, 62, 78][k] + o * 2,
      }));

      await ctx.db.insert("vessel_sample_data", {
        vesselId: vessel._id,
        portCalls,
        voyages,
        monthlyStats,
        weeklyPerformance,
        speedDistribution,
      });
      seeded++;
    }

    return { seeded, total: vessels.length };
  },
});

// Patch existing monthly stats to 12 months with cargoMt
export const patchMonthlyStats = mutation({
  args: {},
  handler: async (ctx) => {
    const allMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const docs = await ctx.db.query("vessel_sample_data").collect();
    const vessels = await ctx.db.query("vessels").collect();
    let patched = 0;

    for (const doc of docs) {
      const needsPatch = doc.monthlyStats.length < 12 || doc.monthlyStats.some((m) => m.cargoMt == null);
      if (!needsPatch) continue;

      const i = vessels.findIndex((v) => v._id === doc.vesselId);
      const o = i >= 0 ? i % 3 : 0;
      const updatedStats = allMonths.map((month, k) => ({
        month,
        ladenDays: 17 + (o * 2) + (k % 3),
        ballastDays: 9 + o + (k % 2),
        cargoMt: k % 4 === 3 ? 0 : 160000 + (i % 5) * 1500 + (o * 2000) + (k % 3) * 3000,
      }));
      await ctx.db.patch(doc._id, { monthlyStats: updatedStats });
      patched++;
    }

    return { patched, total: docs.length };
  },
});
