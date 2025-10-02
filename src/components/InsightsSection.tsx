import { Chart, createChartConfig, Combobox, Button } from "@rafal.lemieszewski/tide-ui";

export function InsightsSection() {

  // Generate 12 months data (6 past, 6 future) with 4 data points per month
  const generateMonthlyData = () => {
    const months = ["Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26"];
    const data: Array<{
      name: string;
      rate: number | null;
      prediction: number | null;
      index: number | null;
      counterpartyRange: [number, number] | null;
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

        data.push({
          name: month,
          rate: (isPast || isTransitionPoint) ? rateValue : null,
          prediction: (!isPast || isTransitionPoint) ? rateValue : null,
          index: (isPast || isTransitionPoint) ? Number((baseIndex + indexVariation).toFixed(1)) : null,
          counterpartyRange: (isPast || isTransitionPoint) ? [minCounterparty, maxCounterparty] : null
        });
      }
    });

    return data;
  };

  const freightRateData = generateMonthlyData();

  const cargoDemandData = [
    { name: "Mar 25", demand: 280 },
    { name: "Apr 25", demand: 320 },
    { name: "May 25", demand: 295 },
    { name: "Jun 25", demand: 340 },
    { name: "Jul 25", demand: 310 },
    { name: "Aug 25", demand: 360 },
    { name: "Sep 25", demand: 330 },
    { name: "Oct 25", demand: 315 },
    { name: "Nov 25", demand: 298 },
    { name: "Dec 25", demand: 345 },
    { name: "Jan 26", demand: 372 },
    { name: "Feb 26", demand: 355 },
  ];

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

  const vesselSupplyData = [
    { name: "Mar 25", available: 45, utilization: 84 },
    { name: "Apr 25", available: 48, utilization: 88 },
    { name: "May 25", available: 46, utilization: 85 },
    { name: "Jun 25", available: 50, utilization: 90 },
    { name: "Jul 25", available: 52, utilization: 85 },
    { name: "Aug 25", available: 55, utilization: 87 },
    { name: "Sep 25", available: 53, utilization: 87 },
    { name: "Oct 25", available: 51, utilization: 84 },
    { name: "Nov 25", available: 49, utilization: 82 },
    { name: "Dec 25", available: 54, utilization: 89 },
    { name: "Jan 26", available: 58, utilization: 91 },
    { name: "Feb 26", available: 56, utilization: 88 },
  ];

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
    demand: {
      label: "Demand (MT)",
      color: "var(--color-chart-bar-1)",
    },
  });

  const vesselSupplyConfig = createChartConfig({
    available: {
      label: "Available Vessels",
      color: "var(--color-chart-bar-1)",
      type: "bar",
    },
    utilization: {
      label: "Utilization %",
      color: "var(--color-chart-line-1)",
      type: "line",
      showDots: false,
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
        }

        /* Tablet layout: 2x2 grid when container is 780px+ */
        @container (min-width: 780px) {
          .insights-grid {
            grid-template-columns: 1fr 1fr;
          }
          .divider-tablet-v { display: block !important; }
          .divider-tablet-h { display: block !important; }
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
          align-items: flex-start;
        }

        /* Chart body with dynamic height */
        .insights-chart-body {
          min-height: 260px;
        }
      `}</style>

      <div className="insights-container rounded-lg border border-[var(--color-border-primary-subtle)] bg-[var(--color-surface-primary)] relative overflow-hidden">
        {/* Desktop dividers (1328px+) */}
        <div className="divider-desktop-1 hidden absolute top-0 bottom-0 left-1/4 w-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-desktop-2 hidden absolute top-0 bottom-0 left-2/4 w-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-desktop-3 hidden absolute top-0 bottom-0 left-3/4 w-px bg-[var(--color-border-primary-subtle)]"></div>

        {/* Tablet dividers (600px-1327px) */}
        <div className="divider-tablet-v hidden absolute top-0 bottom-0 left-2/4 w-px bg-[var(--color-border-primary-subtle)]"></div>
        <div className="divider-tablet-h hidden absolute left-0 right-0 top-2/4 h-px bg-[var(--color-border-primary-subtle)]"></div>

        <div className="insights-grid">
        {/* Freight Rate */}
        <div className="insights-chart">
          <div className="insights-chart-header !flex-row !items-center gap-2 min-w-0">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Freight rate
            </h3>
            <Combobox
              options={maritimeRoutes}
              value="c3"
              placeholder="Select route"
              searchPlaceholder="Search routes..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 max-w-[200px] justify-between" dropdown>
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
              tooltipMaxWidth="max-w-48"
              yAxisTickCount={5}
              showLegend={true}
              legendOrder={["rate", "prediction", "index", "counterpartyRange"]}
            />
          </div>
        </div>

        {/* Bunker Pricing */}
        <div className="insights-chart">
          <div className="insights-chart-header !flex-row !items-center gap-2 min-w-0">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Bunker pricing
            </h3>
            <Combobox
              options={ports}
              value="singapore-sg"
              placeholder="Select port"
              searchPlaceholder="Search ports..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 max-w-[140px] justify-between" dropdown>
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
                <Button size="sm" variant="default" className="min-w-0 max-w-[100px] justify-between" dropdown>
                  <span className="truncate">{selectedOption?.label || placeholder}</span>
                </Button>
              )}
            />
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
              yAxisTickCount={5}
              showLegend={true}
              legendOrder={["spotBunkerRate", "spotFreightRate"]}
            />
          </div>
        </div>

        {/* Supply and Demand */}
        <div className="insights-chart">
          <div className="insights-chart-header !flex-row !items-center gap-2 min-w-0">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Supply and demand
            </h3>
            <Combobox
              options={maritimeRoutes}
              value="c3"
              placeholder="Select route"
              searchPlaceholder="Search routes..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 max-w-[200px] justify-between" dropdown>
                  <span className="truncate">{selectedOption?.label || placeholder}</span>
                </Button>
              )}
            />
          </div>
          <div className="insights-chart-body">
            <Chart
              type="bar"
              data={cargoDemandData}
              config={cargoDemandConfig}
              height={200}
              legendHeight={44}
              responsive={true}
              maintainAspectRatio={false}
              yAxisWidth={30}
              yAxisTickCount={5}
            />
          </div>
        </div>

        {/* Congestion in Port */}
        <div className="insights-chart">
          <div className="insights-chart-header !flex-row !items-center gap-2 min-w-0">
            <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">
              Congestion in port
            </h3>
            <Combobox
              options={ports}
              value="qingdao-cn"
              placeholder="Select port"
              searchPlaceholder="Search ports..."
              trigger={({ selectedOption, placeholder }) => (
                <Button size="sm" variant="default" className="flex-1 min-w-0 max-w-[140px] justify-between" dropdown>
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
              yAxisTickCount={5}
            />
          </div>
        </div>
      </div>
      </div>
    </>
  );
}