import { Chart, createChartConfig, Combobox, Button } from "@rafal.lemieszewski/tide-ui";

export function InsightsSection() {

  // Generate 12 months data (6 past, 6 future) with 4 data points per month
  const generateMonthlyData = () => {
    const months = ["Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26"];
    const data: Array<{
      name: string;
      rate?: number;
      prediction?: number;
      index?: number;
      counterpartyRange?: [number, number];
    }> = [];

    // Past 6 months with actual data
    const pastRates = [15, 12, 14, 16, 18, 13];
    const pastIndex = [10, 11, 15, 14, 12, 13];

    // Future 6 months with predictions
    const futureRates = [12, 10, 12, 15, 17, 16];
    const futureIndex = [11, 9, 13, 14, 16, 17];

    months.forEach((month, monthIndex) => {
      const isPast = monthIndex < 6;
      const dataIndex = isPast ? monthIndex : monthIndex - 6;
      const baseRate = isPast ? pastRates[dataIndex] : futureRates[dataIndex];
      const baseIndex = isPast ? pastIndex[dataIndex] : futureIndex[dataIndex];

      // Generate 4 data points per month with some variation
      for (let i = 0; i < 4; i++) {
        const variation = (Math.random() - 0.5) * 4; // ±2 variation
        const indexVariation = (Math.random() - 0.5) * 2; // ±1 variation

        const minCounterparty = Number((baseRate + variation - 2 - Math.random() * 2).toFixed(1));
        const maxCounterparty = Number((baseRate + variation + 2 + Math.random() * 2).toFixed(1));
        const rateValue = Number((baseRate + variation).toFixed(1));

        // Create connection point: first future month (Sep 25, index 6) has both rate and prediction
        const isTransitionPoint = monthIndex === 6;

        // Add week number to make each data point unique for hover
        const weekLabel = i === 0 ? month : `${month} W${i + 1}`;

        data.push({
          name: weekLabel,
          rate: (isPast || isTransitionPoint) ? rateValue : undefined,
          prediction: (!isPast || isTransitionPoint) ? rateValue : undefined,
          index: (isPast || isTransitionPoint) ? Number((baseIndex + indexVariation).toFixed(1)) : undefined,
          counterpartyRange: (isPast || isTransitionPoint) ? [minCounterparty, maxCounterparty] : undefined
        });
      }
    });

    return data;
  };

  const freightRateData = generateMonthlyData();

  // Generate weekly supply and demand data (12 months × 4 weeks = 48 data points)
  const generateSupplyDemandData = () => {
    const months = ["Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26"];
    const data: Array<{
      name: string;
      ladenPercent?: number;
      ladenPercentAvg?: number;
      vesselsCount?: number;
    }> = [];

    // Base values for Laden % and Vessels count
    const baseLadenPercent = [55, 50, 45, 42, 40, 38, 40, 35, 30, 25, 22, 25];
    const baseVesselsCount = [65, 70, 68, 72, 65, 70, 75, 68, 60, 55, 58, 60];

    months.forEach((month, monthIndex) => {
      const baseLaden = baseLadenPercent[monthIndex];
      const baseVessels = baseVesselsCount[monthIndex];

      // Generate 4 data points per month with variation
      for (let i = 0; i < 4; i++) {
        const ladenVariation = (Math.random() - 0.5) * 20;
        const vesselsVariation = (Math.random() - 0.5) * 15;

        const ladenValue = Math.max(10, Math.min(90, baseLaden + ladenVariation));
        const vesselsValue = Math.max(20, Math.min(100, baseVessels + vesselsVariation));

        data.push({
          name: month,
          ladenPercent: Number(ladenValue.toFixed(1)),
          vesselsCount: Math.round(vesselsValue),
        });
      }
    });

    // Calculate 4-week rolling average for Laden %
    data.forEach((point, index) => {
      if (index >= 3) {
        const sum = data.slice(index - 3, index + 1).reduce((acc, p) => acc + (p.ladenPercent || 0), 0);
        point.ladenPercentAvg = Number((sum / 4).toFixed(1));
      }
    });

    return data;
  };

  const cargoDemandData = generateSupplyDemandData();

  const bunkerPricingData = [
    { name: "Mar 25", spotBunkerRate: 580, spotFreightRate: 15 },
    { name: "Apr 25", spotBunkerRate: 620, spotFreightRate: 12 },
    { name: "May 25", spotBunkerRate: 595, spotFreightRate: 14 },
    { name: "Jun 25", spotBunkerRate: 640, spotFreightRate: 16 },
    { name: "Jul 25", spotBunkerRate: 610, spotFreightRate: 18 },
    { name: "Aug 25", spotBunkerRate: 660, spotFreightRate: 13 },
    { name: "Sep 25", spotBunkerRate: 630, spotFreightRate: 12 },
    { name: "Oct 25", spotBunkerRate: 615, spotFreightRate: 10 },
    { name: "Nov 25", spotBunkerRate: 598, spotFreightRate: 12 },
    { name: "Dec 25", spotBunkerRate: 645, spotFreightRate: 15 },
    { name: "Jan 26", spotBunkerRate: 672, spotFreightRate: 17 },
    { name: "Feb 26", spotBunkerRate: 655, spotFreightRate: 16 },
  ];

  // Generate weekly congestion in port data (12 months × 4 weeks = 48 data points)
  const generateCongestionData = () => {
    const months = ["Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26"];
    const data: Array<{
      name: string;
      vesselsInPort?: number;
      avgDuration?: number;
    }> = [];

    // Base values for Vessels in port and Average duration
    const baseVesselsInPort = [55, 60, 65, 70, 60, 55, 50, 45, 50, 60, 65, 70];
    const baseAvgDuration = [2.8, 2.6, 2.4, 1.8, 2.6, 2.4, 2.0, 2.8, 3.0, 2.6, 2.2, 1.8];

    months.forEach((month, monthIndex) => {
      const baseVessels = baseVesselsInPort[monthIndex];
      const baseDuration = baseAvgDuration[monthIndex];

      // Generate 4 data points per month with variation
      for (let i = 0; i < 4; i++) {
        const vesselsVariation = (Math.random() - 0.5) * 20;
        const durationVariation = (Math.random() - 0.5) * 1.0;

        const vesselsValue = Math.max(20, Math.min(100, baseVessels + vesselsVariation));
        const durationValue = Math.max(1.0, Math.min(6.0, baseDuration + durationVariation));

        const weekLabel = i === 0 ? month : `${month} W${i + 1}`;

        data.push({
          name: weekLabel,
          vesselsInPort: Math.round(vesselsValue),
          avgDuration: Number(durationValue.toFixed(1)),
        });
      }
    });

    return data;
  };

  const vesselSupplyData = generateCongestionData();

  const freightRateConfig = createChartConfig({
    rate: {
      label: "Freight rate ($/mt)",
      color: "var(--color-chart-line-1)",
      type: "line",
      showDots: false,
      strokeStyle: "solid",
    },
    prediction: {
      label: "Prediction ($/mt)",
      color: "var(--color-chart-line-1)",
      type: "line",
      showDots: false,
      strokeStyle: "dashed",
    },
    index: {
      label: "Index ($/mt)",
      color: "var(--color-chart-line-4)",
      type: "line",
      showDots: false,
    },
    counterpartyRange: {
      label: "Max/Min counterparty ($/mt)",
      type: "range-area",
      stroke: "none",
      fill: "#C8D8E1",
    },
  });

  const bunkerPricingConfig = createChartConfig({
    spotBunkerRate: {
      label: "Spot bunker rate ($/mt)",
      color: "var(--color-chart-line-1)",
      type: "line",
      showDots: false,
    },
    spotFreightRate: {
      label: "Spot freight rate ($/mt)",
      color: "var(--color-chart-line-2)",
      type: "line",
      showDots: false,
      yAxisId: "right",
    },
  });

  const cargoDemandConfig = createChartConfig({
    ladenPercent: {
      label: "Laden %",
      color: "var(--color-chart-line-1)",
      type: "line",
      showDots: false,
    },
    ladenPercentAvg: {
      label: "Laden % (4 week avg.)",
      color: "var(--color-chart-line-4)",
      type: "line",
      showDots: false,
    },
    vesselsCount: {
      label: "Vessels count",
      type: "bar",
      color: "#e5eff3",
      yAxisId: "right",
    },
  });

  const vesselSupplyConfig = createChartConfig({
    vesselsInPort: {
      label: "Vessels in port",
      type: "bar",
      color: "#e5eff3",
    },
    avgDuration: {
      label: "Avg. duration (days)",
      color: "var(--color-chart-line-4)",
      type: "line",
      showDots: false,
      yAxisId: "right",
    },
  });

  // Maritime routes for the combobox
  const maritimeRoutes = [
    { value: "c3", label: "C3 • Tubarao, BR — Qingdao, CN" },
    { value: "c5", label: "C5 • West Australia – Qingdao, CN" },
    { value: "c4", label: "C4 • Richards Bay, ZA — Qingdao, CN" },
    { value: "p1a", label: "P1A • Corpus Christi, US — Rotterdam, NL" },
    { value: "p2a", label: "P2A • Antwerp, BE — New York, US" },
    { value: "td3", label: "TD3 • Arabian Gulf — Japan" },
    { value: "td5", label: "TD5 • West Africa — US East Coast" },
    { value: "td7", label: "TD7 • North Sea — Continental Europe" },
    { value: "td15", label: "TD15 • West Africa — UK/Continental Europe" },
    { value: "td20", label: "TD20 • Arabian Gulf — Singapore" },
    { value: "bs1", label: "BS1 • Black Sea — Mediterranean" },
    { value: "bs2", label: "BS2 • Baltic Sea — UK/Continental Europe" },
    { value: "bs3", label: "BS3 • US Gulf — Mediterranean" },
    { value: "tc1", label: "TC1 • Middle East Gulf — Japan" },
    { value: "tc2", label: "TC2 • Middle East — Singapore/South Korea" },
    { value: "tc5", label: "TC5 • Middle East — West Coast India" },
    { value: "tc6", label: "TC6 • Algeria/Libya — Mediterranean" },
    { value: "tc8", label: "TC8 • Kuwait — Singapore" },
    { value: "tc14", label: "TC14 • Baltic/UK — Mediterranean" },
    { value: "ca1", label: "CA1 • Argentina — China/Japan" },
    { value: "ca2", label: "CA2 • US Gulf — Japan/China" },
    { value: "ca3", label: "CA3 • US West Coast — Japan/China" },
    { value: "ea1", label: "EA1 • Australia — Japan/China" },
    { value: "ea2", label: "EA2 • Indonesia — China/India" },
    { value: "wa1", label: "WA1 • West Africa — China/Far East" },
    { value: "wa2", label: "WA2 • West Africa — India" },
  ];

  const ports = [
    { value: "qingdao-cn", label: "Qingdao, CN" },
    { value: "rotterdam-nl", label: "Rotterdam, NL" },
    { value: "singapore-sg", label: "Singapore, SG" },
    { value: "houston-us", label: "Houston, US" },
    { value: "fujairah-ae", label: "Fujairah, AE" },
  ];

  const fuelTypes = [
    { value: "vlsfo", label: "VLSFO" },
    { value: "hsfo", label: "HSFO" },
    { value: "mgo", label: "MGO" },
    { value: "lng", label: "LNG" },
  ];

  return (
    <>
      <style>{`
        .insights-container {
          container-type: inline-size;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          align-items: stretch;
          overflow: none;
        }

        /* Mobile horizontal dividers */
        .divider-mobile-1 { display: block !important; }
        .divider-mobile-2 { display: block !important; }
        .divider-mobile-3 { display: block !important; }

        /* Tablet layout: 2x2 grid when container is 780px+ */
        @container (min-width: 780px) {
          .insights-grid {
            grid-template-columns: 1fr 1fr;
          }
          .divider-tablet-v { display: block !important; }
          .divider-tablet-h { display: block !important; }
          .divider-mobile-1 { display: none !important; }
          .divider-mobile-2 { display: none !important; }
          .divider-mobile-3 { display: none !important; }
        }

        /* Desktop layout: 1x4 grid when container is 1280px+ */
        @container (min-width: 1280px) {
          .insights-grid {
            grid-template-columns: 1fr 1fr 1fr 1fr;
          }
          .divider-desktop-1 { display: block !important; }
          .divider-desktop-2 { display: block !important; }
          .divider-desktop-3 { display: block !important; }
          .divider-tablet-v { display: none !important; }
          .divider-tablet-h { display: none !important; }
          .divider-mobile-1 { display: none !important; }
          .divider-mobile-2 { display: none !important; }
          .divider-mobile-3 { display: none !important; }
        }

        /* Chart box styles */
        .insights-chart {
          display: flex;
          flex-direction: column;
          padding: 16px;
          height: 240px;
        }

        /* Chart header */
        .insights-chart-header {
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Chart body with dynamic height */
        .insights-chart-body {
          min-height: 260px;
        }

        /* Responsive ComboBox widths */
        .combobox-route {
          max-width: 220px;
        }

        .combobox-port {
          max-width: 150px;
        }

        .combobox-fuel {
          max-width: 110px;
        }

        /* Smaller widths for 1x4 desktop layout */
        @container (min-width: 1280px) {
          .combobox-route {
            max-width: 160px;
          }
          .combobox-port {
            max-width: 120px;
          }
          .combobox-fuel {
            max-width: 90px;
          }
        }
      `}</style>

      <div className="insights-container rounded-lg border border-[var(--color-border-primary-subtle)] bg-[var(--color-surface-primary)] relative overflow-hidden">
        {/* Desktop dividers (1280px+) - vertical */}
        <div className="divider-desktop-1 hidden absolute top-0 bottom-0 left-1/4 w-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-desktop-2 hidden absolute top-0 bottom-0 left-2/4 w-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-desktop-3 hidden absolute top-0 bottom-0 left-3/4 w-px bg-[var(--color-border-primary-subtle)]"></div>

        {/* Tablet dividers (780px-1279px) */}
        <div className="divider-tablet-v hidden absolute top-0 bottom-0 left-2/4 w-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-tablet-h hidden absolute left-0 right-0 top-2/4 h-px bg-[var(--color-border-primary-subtle)]"></div>

        {/* Mobile dividers (<780px) - horizontal */}
        <div className="divider-mobile-1 hidden absolute left-0 right-0 top-[25%] h-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-mobile-2 hidden absolute left-0 right-0 top-[50%] h-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-mobile-3 hidden absolute left-0 right-0 top-[75%] h-px bg-[var(--color-border-primary-subtle)]"></div>

        <div className="insights-grid">
        {/* Freight Rate */}
        <div className="insights-chart">
          <div className="insights-chart-header">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Freight rate
            </h3>
            <Combobox
              options={maritimeRoutes}
              value="c3"
              placeholder="Select route"
              searchPlaceholder="Search routes..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 combobox-route justify-between" dropdown>
                  <span className="truncate">{selectedOption?.label || placeholder}</span>
                </Button>
              )}
            />
          </div>
          <div className="insights-chart-body">
            <Chart
              type="composed"
              data={freightRateData}
              config={freightRateConfig}
              height={200}
              legendHeight={44}
              responsive={true}
              maintainAspectRatio={false}
              yAxisWidth={30}
              tooltipMaxWidth="max-w-72"
              tooltipAllowEscapeViewBox={{ x: true, y: true }}
              yAxisTickCount={3}
              showLegend={true}
              legendOrder={["rate", "prediction", "index", "counterpartyRange"]}
            />
          </div>
        </div>

        {/* Bunker Pricing */}
        <div className="insights-chart">
          <div className="insights-chart-header">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Bunker pricing
            </h3>
            <div className="flex items-center gap-2">
              <Combobox
                options={ports}
                value="singapore-sg"
                placeholder="Select port"
                searchPlaceholder="Search ports..."
                trigger={({ selectedOption, placeholder }) => (
                  <Button size="sm" variant="default" className="min-w-0 combobox-port justify-between" dropdown>
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                  </Button>
                )}
              />
              <Combobox
                options={fuelTypes}
                value="vlsfo"
                placeholder="Select fuel"
                searchPlaceholder="Search fuel types..."
                trigger={({ selectedOption, placeholder }) => (
                  <Button size="sm" variant="default" className="min-w-0 combobox-fuel justify-between" dropdown>
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                  </Button>
                )}
              />
            </div>
          </div>
          <div className="insights-chart-body">
            <Chart
              type="composed"
              data={bunkerPricingData}
              config={bunkerPricingConfig}
              height={200}
              legendHeight={44}
              responsive={true}
              maintainAspectRatio={false}
              yAxisWidth={30}
              yAxisTickCount={3}
              yAxisDomain={[0, 800]}
              showRightYAxis={true}
              rightYAxisTickCount={3}
              rightYAxisDomain={[0, 20]}
              tooltipAllowEscapeViewBox={{ x: true, y: true }}
              showLegend={true}
              legendOrder={["spotBunkerRate", "spotFreightRate"]}
            />
          </div>
        </div>

        {/* Supply and Demand */}
        <div className="insights-chart">
          <div className="insights-chart-header">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Supply and demand
            </h3>
            <Combobox
              options={maritimeRoutes}
              value="c3"
              placeholder="Select route"
              searchPlaceholder="Search routes..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 combobox-route justify-between" dropdown>
                  <span className="truncate">{selectedOption?.label || placeholder}</span>
                </Button>
              )}
            />
          </div>
          <div className="insights-chart-body">
            <Chart
              type="composed"
              data={cargoDemandData}
              config={cargoDemandConfig}
              height={200}
              legendHeight={44}
              responsive={true}
              maintainAspectRatio={false}
              yAxisWidth={30}
              yAxisTickCount={3}
              yAxisDomain={[0, 100]}
              showRightYAxis={true}
              rightYAxisTickCount={3}
              rightYAxisDomain={[0, 80]}
              tooltipAllowEscapeViewBox={{ x: true, y: true }}
            />
          </div>
        </div>

        {/* Congestion in Port */}
        <div className="insights-chart">
          <div className="insights-chart-header">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Congestion in port
            </h3>
            <Combobox
              options={ports}
              value="qingdao-cn"
              placeholder="Select port"
              searchPlaceholder="Search ports..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 combobox-port justify-between" dropdown>
                  <span className="truncate">{selectedOption?.label || placeholder}</span>
                </Button>
              )}
            />
          </div>
          <div className="insights-chart-body">
            <Chart
              type="composed"
              data={vesselSupplyData}
              config={vesselSupplyConfig}
              height={200}
              legendHeight={44}
              responsive={true}
              maintainAspectRatio={false}
              yAxisWidth={30}
              yAxisTickCount={3}
              yAxisDomain={[0, 100]}
              showRightYAxis={true}
              rightYAxisTickCount={3}
              rightYAxisDomain={[0, 6]}
              tooltipAllowEscapeViewBox={{ x: true, y: true }}
            />
          </div>
        </div>
      </div>
      </div>
    </>
  );
}