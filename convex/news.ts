import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const list = query({
  args: {
    impactLevel: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    category: v.optional(v.string()),
    vesselType: v.optional(v.string()),
    region: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("news").order("desc").collect();

    // Only return items that have the full intelligence card format
    items = items.filter((i) => i.impactLevel !== undefined);

    if (args.impactLevel) {
      items = items.filter((i) => i.impactLevel === args.impactLevel);
    }
    if (args.category) {
      items = items.filter((i) => i.categoryTags?.includes(args.category!));
    }
    if (args.vesselType) {
      items = items.filter((i) => i.vesselTypes?.includes(args.vesselType!));
    }
    if (args.region) {
      items = items.filter((i) => i.regions?.includes(args.region!));
    }

    // Sort: high → medium → low, then newest first within each group
    items.sort((a, b) => {
      const aOrder = IMPACT_ORDER[a.impactLevel ?? "low"] ?? 2;
      const bOrder = IMPACT_ORDER[b.impactLevel ?? "low"] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.publishedAt - a.publishedAt;
    });

    return items.slice(0, args.limit ?? 20);
  },
});

export const getHighImpactCount = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("news")
      .withIndex("by_impactLevel", (q) => q.eq("impactLevel", "high"))
      .collect();
    return items.length;
  },
});

export const seedIntelligenceCards = mutation({
  args: {},
  handler: async (ctx) => {
    // Remove any existing intelligence cards to avoid duplicates
    const existing = await ctx.db.query("news").collect();
    const intelligenceItems = existing.filter((i) => i.impactLevel !== undefined);
    for (const item of intelligenceItems) {
      await ctx.db.delete(item._id);
    }

    const now = Date.now();
    const h = (hrs: number) => now - hrs * 60 * 60 * 1000;

    const cards = [
      {
        title: "US–Iran tensions escalate after naval incident in the Persian Gulf",
        summary:
          "Iranian naval forces reportedly intercepted a commercial tanker in the Persian Gulf, raising concerns about shipping security and potential regional escalation affecting global energy flows.",
        category: "Geopolitics & Security",
        priority: "breaking" as const,
        publishedAt: h(2),
        url: undefined,
        impactLevel: "high" as const,
        sourceName: "Reuters",
        shippingInsight:
          "The Strait of Hormuz carries approximately 20% of global oil shipments. Any sustained escalation could disrupt tanker routing, forcing vessels onto longer alternative routes around the Cape of Good Hope.",
        marketImpact:
          "VLCC and Suezmax spot rates likely to spike on Middle East–Asia routes. War risk insurance premiums for Gulf voyages expected to increase within 24–48 hours. Bunker exposure elevated.",
        contractRisk:
          "Charter parties covering Middle East loading ports may trigger war risk clause provisions. Sanctions compliance review required for any Iranian-adjacent counterparty exposure. Force majeure risk if port calls become impossible.",
        recommendedAction:
          "Monitor BIMCO and IMO security advisories. Review war risk insurance coverage with P&I clubs. Brief voyage operators on contingency routing. Check charter party war risk clause wording.",
        vesselTypes: ["Tankers"],
        regions: ["Middle East"],
        categoryTags: ["Geopolitics & Security"],
        keySignals: ["Tanker rates ↑", "War risk clauses", "Insurance premiums ↑"],
        isAiGenerated: true,
      },
      {
        title: "Panama Canal reduces daily transits by 20% amid severe drought — backlog growing",
        summary:
          "The Panama Canal Authority has imposed additional draft restrictions due to historically low Gatun Lake water levels, cutting daily vessel transits and generating a growing queue of over 150 vessels.",
        category: "Port & Canal Disruptions",
        priority: "breaking" as const,
        publishedAt: h(4),
        url: undefined,
        impactLevel: "high" as const,
        sourceName: "TradeWinds",
        shippingInsight:
          "Vessels over 13m draft are being diverted to the Suez Canal or Cape Horn, adding 10–14 days to transit times. Dry bulk and container segments most affected. Slot auction prices surging.",
        marketImpact:
          "Panamax bulk rates rising on trans-Pacific routes. Container spot rates from Asia to US East Coast increasing. Suez Canal and Cape Horn routing alternatives driving incremental fuel costs of $300K–$500K per voyage.",
        contractRisk:
          "Laycan windows at US East Coast and Gulf ports under pressure. Demurrage exposure increasing for voyage charters with tight laytime provisions. Clauses referencing 'canal passage' may require interpretation.",
        recommendedAction:
          "Review laycan provisions in open voyage charters. Assess cost of slot auction vs. rerouting. Notify charterers of potential delays and document force majeure if canal restrictions prevent contractual routing.",
        vesselTypes: ["Dry Bulk", "Containers"],
        regions: ["Americas"],
        categoryTags: ["Port & Canal Disruptions"],
        keySignals: ["Laycan windows at risk", "Demurrage exposure ↑", "Slot auction prices ↑"],
        isAiGenerated: true,
      },
      {
        title: "EU announces 14th sanctions package — new vessel designations expand shadow fleet restrictions",
        summary:
          "The European Union has published its 14th package of Russia-related sanctions, designating 73 additional vessels linked to Russian oil transport and tightening restrictions on third-country facilitators.",
        category: "Geopolitics & Security",
        priority: "breaking" as const,
        publishedAt: h(6),
        url: undefined,
        impactLevel: "high" as const,
        sourceName: "Lloyd's List",
        shippingInsight:
          "Newly designated vessels face port bans across EU member states and restrictions on accessing EU-based services including insurance, classification, and ship management.",
        marketImpact:
          "Compliant tanker fleet effectively shrinks, tightening available tonnage for non-sanctioned crude liftings. Clean tanker and VLCC rates may see upward pressure as operators prioritize compliant routes.",
        contractRisk:
          "Counterparty due diligence obligations intensify. Charter parties with sanctioned or designated owners/operators may become void or unenforceable. P&I cover for non-compliant voyages likely withdrawn.",
        recommendedAction:
          "Screen all active and pending fixtures against updated sanctions lists. Legal review of contracts with Russian or CIS counterparty exposure. Confirm P&I and hull insurance validity for any affected vessels.",
        vesselTypes: ["Tankers"],
        regions: ["Europe", "Global"],
        categoryTags: ["Geopolitics & Security", "Regulation & Compliance"],
        keySignals: ["Counterparty screening", "P&I cover risk", "Fleet availability ↓"],
        isAiGenerated: true,
      },
      {
        title: "Singapore Port congestion worsens — average vessel waiting time reaches 5 days",
        summary:
          "A surge in vessel calls at the Port of Singapore, driven by Red Sea diversions and peak season volumes, has pushed average anchorage waiting times to 5 days, with container yard utilization above 90%.",
        category: "Port & Canal Disruptions",
        priority: "normal" as const,
        publishedAt: h(5),
        url: undefined,
        impactLevel: "medium" as const,
        sourceName: "Splash247",
        shippingInsight:
          "Singapore is the world's second-busiest container port and a critical transshipment hub. Congestion is cascading to feeder services across Southeast Asia and affecting connecting schedules to Australia and India.",
        marketImpact:
          "Container shipping costs from Asia-Europe and intra-Asia routes seeing surcharges. Slot capacity tightening on key lanes. Feeder operators passing on delay costs to shippers.",
        contractRisk:
          "Laytime and demurrage provisions under CIF/FOB contracts may be triggered at Singapore transshipment connections. Delivery obligation timelines at risk for contracts specifying Singapore arrival dates.",
        recommendedAction:
          "Notify cargo owners of likely delays. Review laytime terms in affected contracts. Explore alternative transshipment hubs (Port Klang, Tanjung Pelepas) for rerouting.",
        vesselTypes: ["Containers"],
        regions: ["Asia Pacific"],
        categoryTags: ["Port & Canal Disruptions"],
        keySignals: ["Schedule delays", "Demurrage risk", "Laytime impact"],
        isAiGenerated: true,
      },
      {
        title: "Tropical Storm Bertha disrupts US Gulf Coast port operations — loadings suspended",
        summary:
          "Tropical Storm Bertha is tracking toward the Louisiana coast, prompting the suspension of grain and coal loading operations at New Orleans and South Louisiana export terminals.",
        category: "Weather & Natural Events",
        priority: "normal" as const,
        publishedAt: h(3),
        url: undefined,
        impactLevel: "medium" as const,
        sourceName: "Bloomberg",
        shippingInsight:
          "US Gulf is the world's largest grain export corridor. A 3–5 day loading suspension during peak export season could delay 15–20 vessels currently on berth or at anchor.",
        marketImpact:
          "Capesize and Panamax rates on trans-Atlantic routes may firm if delays persist. Grain cargo insurance may be triggered for weather-related damage to exposed cargo. Fuel hedging positions worth reviewing.",
        contractRisk:
          "Weather exceptions in charter party laytime clauses will be scrutinised. Force majeure claims possible for cargo contracts with fixed delivery windows. Demurrage accrual suspended during port closure under most standard forms.",
        recommendedAction:
          "Issue weather notices to owners and charterers. Review NOR (Notice of Readiness) obligations for vessels already on demurrage. Confirm cargo insurance coverage for storm damage during loading suspension.",
        vesselTypes: ["Dry Bulk"],
        regions: ["Americas"],
        categoryTags: ["Weather & Natural Events"],
        keySignals: ["Weather exceptions", "Force majeure risk", "Demurrage suspended"],
        isAiGenerated: true,
      },
      {
        title: "China LNG imports hit 6-month high as domestic gas demand surges ahead of winter",
        summary:
          "China's LNG imports reached a 6-month high in February as lower temperatures and industrial restocking drove domestic gas demand to seasonal peaks, drawing additional spot cargoes from Atlantic Basin suppliers.",
        category: "Trade Flows & Commodity Markets",
        priority: "normal" as const,
        publishedAt: h(8),
        url: undefined,
        impactLevel: "medium" as const,
        sourceName: "Reuters",
        shippingInsight:
          "Increased China demand is tightening spot availability of LNG carriers on Pacific routes. Atlantic Basin cargoes travelling to Asia are displacing traditional Pacific supply, lengthening voyage distances and absorbing ton-miles.",
        marketImpact:
          "LNG carrier spot rates on Atlantic–Asia routes rising. Competition for short-term LNG tonnage increasing ahead of Northern Hemisphere summer cooling demand buildup. JKM spot price likely to firm.",
        contractRisk:
          "Long-term LNG supply contracts with destination flexibility clauses will see increased diversion toward Asia. Review price indexation and cargo diversion provisions in existing long-term agreements.",
        recommendedAction:
          "Assess LNG carrier availability for upcoming fixtures. Review swing volume provisions in long-term contracts. Monitor JKM–TTF spread for arbitrage opportunities.",
        vesselTypes: ["LNG"],
        regions: ["Asia Pacific"],
        categoryTags: ["Trade Flows & Commodity Markets", "Freight Market Movements"],
        keySignals: ["LNG carrier rates ↑", "Ton-miles increasing", "JKM firming"],
        isAiGenerated: true,
      },
      {
        title: "IMO finalises 2026 CII framework amendments — stricter reduction factors confirmed",
        summary:
          "The IMO Marine Environment Protection Committee (MEPC) has finalised amendments to the Carbon Intensity Indicator (CII) framework, confirming tighter annual reduction factors from 2026 with enhanced enforcement mechanisms.",
        category: "Regulation & Compliance",
        priority: "normal" as const,
        publishedAt: h(24),
        url: undefined,
        impactLevel: "low" as const,
        sourceName: "Splash247",
        shippingInsight:
          "Vessels rated D or E under CII face increased risk of operational restrictions and charter party compliance obligations. Older, less efficient vessels in dry bulk and tanker segments most exposed.",
        marketImpact:
          "Premium for fuel-efficient modern tonnage expected to widen. Slow steaming becoming contractually mandated in some trade lanes. Retrofit demand for wind-assist and energy-saving technologies increasing.",
        contractRisk:
          "Charter parties without CII compliance clauses may face disputes over operational obligations and off-hire risk. Owners and charterers must align on speed, routing, and fuel optimisation to maintain CII ratings.",
        recommendedAction:
          "Audit fleet CII ratings against 2026 thresholds. Review charter party fuel efficiency and speed provisions. Engage legal counsel on retrofitting responsibility allocation in existing long-term charters.",
        vesselTypes: ["Tankers", "Dry Bulk"],
        regions: ["Global"],
        categoryTags: ["Regulation & Compliance"],
        keySignals: ["CII D/E rating risk", "Speed provisions", "Retrofit allocation"],
        isAiGenerated: true,
      },
    ];

    for (const card of cards) {
      await ctx.db.insert("news", card);
    }

    return { seeded: cards.length };
  },
});
