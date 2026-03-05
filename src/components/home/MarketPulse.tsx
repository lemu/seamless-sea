import { useMemo, useState } from "react";
import { Combobox, Button, Card } from "@rafal.lemieszewski/tide-ui";
import { Chart, createChartConfig } from "@rafal.lemieszewski/tide-ui/chart";
import type { ChartConfig } from "@rafal.lemieszewski/tide-ui/chart";

const MONTHS = ["Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26"];

function generateFreightData() {
  const baseRates = [15, 12, 14, 16, 18, 13, 12, 10, 12, 15, 17, 16];
  return MONTHS.map((name, i) => ({
    name,
    rate: Number((baseRates[i] + (Math.random() - 0.5) * 3).toFixed(1)),
  }));
}

function generateBunkerData() {
  const basePrices = [580, 620, 595, 640, 610, 660, 630, 615, 598, 645, 672, 655];
  return MONTHS.map((name, i) => ({
    name,
    price: Math.round(basePrices[i] + (Math.random() - 0.5) * 30),
  }));
}

const MARITIME_ROUTES = [
  { value: "c3", label: "C3 • Tubarao — Qingdao" },
  { value: "c5", label: "C5 • W. Australia — Qingdao" },
  { value: "p1a", label: "P1A • Corpus Christi — Rotterdam" },
  { value: "td3", label: "TD3 • Arabian Gulf — Japan" },
  { value: "td20", label: "TD20 • Arabian Gulf — Singapore" },
];

const FUEL_TYPES = [
  { value: "vlsfo", label: "VLSFO" },
  { value: "hsfo", label: "HSFO" },
  { value: "mgo", label: "MGO" },
  { value: "lng", label: "LNG" },
];

const freightConfig = createChartConfig({
  rate: { label: "Freight rate ($/mt)", type: "line", color: "var(--color-chart-line-1)" },
} as ChartConfig);

const bunkerConfig = createChartConfig({
  price: { label: "Bunker price ($/mt)", type: "line", color: "var(--color-chart-line-2)" },
} as ChartConfig);

export function MarketPulse() {
  const [freightRoute, setFreightRoute] = useState("c3");
  const [fuelType, setFuelType] = useState("vlsfo");

  // Re-generate when route/fuel changes to simulate different data
  const freightData = useMemo(() => generateFreightData(), [freightRoute]); // eslint-disable-line react-hooks/exhaustive-deps
  const bunkerData = useMemo(() => generateBunkerData(), [fuelType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section>
      <h2 className="text-heading-sm text-[var(--color-text-primary)] mb-4">Market Pulse</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Freight Rate Trend */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">Freight Rate Trend</h3>
              <Combobox
                options={MARITIME_ROUTES}
                value={freightRoute}
                onValueChange={setFreightRoute}
                placeholder="Select route"
                searchPlaceholder="Search routes…"
                trigger={({ selectedOption, placeholder }) => (
                  <Button size="s" variant="default" className="flex-1 min-w-0 max-w-[180px] justify-between" dropdown>
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                  </Button>
                )}
              />
            </div>
            <Chart
              type="composed"
              data={freightData}
              config={freightConfig}
              height={180}
              showLegend
              showTooltip
              showGrid
              legendHeight={36}
              yAxisTickCount={3}
              margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
            />
          </div>
        </Card>

        {/* Bunker Price Trend */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-heading-xsm text-[var(--color-text-primary)] whitespace-nowrap">Bunker Price Trend</h3>
              <Combobox
                options={FUEL_TYPES}
                value={fuelType}
                onValueChange={setFuelType}
                placeholder="Select fuel"
                searchPlaceholder="Search…"
                trigger={({ selectedOption, placeholder }) => (
                  <Button size="s" variant="default" className="min-w-0 max-w-[120px] justify-between" dropdown>
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                  </Button>
                )}
              />
            </div>
            <Chart
              type="composed"
              data={bunkerData}
              config={bunkerConfig}
              height={180}
              showLegend
              showTooltip
              showGrid
              legendHeight={36}
              yAxisTickCount={3}
              yAxisDomain={[400, 800]}
              margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
            />
          </div>
        </Card>
      </div>
    </section>
  );
}
