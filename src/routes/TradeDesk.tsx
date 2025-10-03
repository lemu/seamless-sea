import { useState, useMemo } from "react";
import {
  type ColumnDef,
} from "@tanstack/react-table";
import {
  DataTable,
  Badge,
  Button,
  Icon,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Toggle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@rafal.lemieszewski/tide-ui";
import { InsightsSection } from "../components/InsightsSection";

// Define types for multi-level order structure
interface OrderData {
  id: string;
  counterparty: string;
  broker?: string;
  type: string;
  stage: string;
  laycan: string;
  vessel: string;
  lastBid: string;
  lastOffer: string;
  demurrage: string;
  tce: string;
  validity: string;
  isBrokerGroup?: boolean;
  children?: OrderData[];
}

// Generate multi-level order data according to the guide
const generateMultiLevelOrderData = (): OrderData[] => {
  const counterparties = [
    'Teekay Corp', 'Frontline Ltd.', 'Maran Tankers', 'Seaspan', 'Euronav NV', 'Minerva Marine',
    'International Seaways', 'AET', 'Maersk Tankers', 'Nordic Tankers', 'DHT Holdings',
    'Scorpio Tankers', 'Hafnia Limited', 'Stena Bulk', 'Norden', 'Golden Ocean',
    'Star Bulk Carriers', 'Eagle Bulk', 'Genco Shipping', 'Safe Bulkers'
  ];
  const brokers = ['Clarksons', 'Gibson Shipbrokers', 'Braemar ACM', 'SSY', 'Arrow Shipbroking', 'Howe Robinson'];
  const vessels = [
    'Copper Spirit', 'Front Sparta', 'Maran Poseidon', 'Cedar', 'Minerva Vera', 'Ocean Voyager',
    'Trinity', 'Nordic Sky', 'Baltic Crown', 'Atlantic Pioneer', 'Pacific Dawn', 'Mediterranean Star',
    'Arctic Explorer', 'Coral Reef', 'Diamond Wave', 'Emerald Tide', 'Golden Horizon', 'Silver Stream'
  ];
  const stages = ['Offer', 'Active', 'Pending', 'Negotiating'];
  const types = ['+/-', 'Buy', 'Sell', 'Charter'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Generate random ID
  const generateId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  // Generate random laycan date
  const generateLaycan = () => {
    const startDay = Math.floor(Math.random() * 28) + 1;
    const endDay = startDay + Math.floor(Math.random() * 5) + 1;
    const month = months[Math.floor(Math.random() * months.length)];
    const year = 2025 + Math.floor(Math.random() * 2);
    return `${startDay} ${month} ${year} — ${endDay} ${month} ${year}`;
  };

  // Level 3: Individual Offer
  const generateIndividualOffer = (counterparty: string, broker: string): OrderData => {
    const wsBase = 85 + Math.floor(Math.random() * 20);
    return {
      id: '',
      counterparty,
      broker,
      type: '',
      stage: stages[Math.floor(Math.random() * stages.length)],
      laycan: generateLaycan(),
      vessel: vessels[Math.floor(Math.random() * vessels.length)],
      lastBid: `WS ${wsBase}-${wsBase + 5}`,
      lastOffer: `WS ${wsBase + 2}-${wsBase + 7}`,
      demurrage: `$${(Math.random() * 40000 + 50000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
      tce: Math.random() > 0.3 ? `$${(Math.random() * 150000 + 150000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-',
      validity: Math.random() > 0.7 ? `${Math.floor(Math.random() * 48) + 1}h` : '-',
    };
  };

  // Level 2: Broker Group (section header)
  const generateBrokerGroup = (broker: string, counterpartiesList: string[]): OrderData => ({
    id: `broker-${broker.toLowerCase().replace(/\s/g, '-')}`,
    counterparty: broker,
    broker,
    type: '',
    stage: '',
    laycan: '',
    vessel: '',
    lastBid: '',
    lastOffer: '',
    demurrage: '',
    tce: '',
    validity: '',
    isBrokerGroup: true,
    children: counterpartiesList.map((cp) => generateIndividualOffer(cp, broker))
  });

  // Level 1: Order (top-level aggregation)
  const generateOrder = (): OrderData => {
    // Randomly select 2-8 counterparties
    const numCounterparties = Math.floor(Math.random() * 7) + 2;
    const selectedCounterparties: string[] = [];
    for (let i = 0; i < numCounterparties; i++) {
      selectedCounterparties.push(counterparties[Math.floor(Math.random() * counterparties.length)]);
    }

    const uniqueCounterparties = [...new Set(selectedCounterparties)];
    const displayCounterparty = uniqueCounterparties.length > 2
      ? `${uniqueCounterparties.slice(0, 2).join(', ')} + ${uniqueCounterparties.length - 2}`
      : uniqueCounterparties.join(', ');

    const allOffers = selectedCounterparties.length;
    const minDemurrage = 60000 + Math.floor(Math.random() * 20000);
    const maxDemurrage = minDemurrage + Math.floor(Math.random() * 30000) + 10000;
    const wsMin = 85 + Math.floor(Math.random() * 15);
    const wsMax = wsMin + 5 + Math.floor(Math.random() * 10);

    // Randomly select 2-3 brokers
    const numBrokers = Math.floor(Math.random() * 2) + 2;
    const selectedBrokers = [];
    const shuffledBrokers = [...brokers].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numBrokers; i++) {
      const brokersStart = Math.floor(i * selectedCounterparties.length / numBrokers);
      const brokersEnd = Math.floor((i + 1) * selectedCounterparties.length / numBrokers);
      const brokerCounterparties = selectedCounterparties.slice(brokersStart, brokersEnd);

      if (brokerCounterparties.length > 0) {
        selectedBrokers.push(generateBrokerGroup(shuffledBrokers[i], brokerCounterparties));
      }
    }

    return {
      id: generateId(),
      counterparty: displayCounterparty,
      type: types[Math.floor(Math.random() * types.length)],
      stage: 'Active',
      laycan: generateLaycan(),
      vessel: `${allOffers} options`,
      lastBid: `WS ${wsMin}-${wsMin + 5}`,
      lastOffer: `WS ${wsMax - 5}-${wsMax}`,
      demurrage: `$${minDemurrage.toLocaleString()}-${maxDemurrage.toLocaleString()}`,
      tce: Math.random() > 0.5 ? `$${(Math.random() * 200000 + 150000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-',
      validity: Math.random() > 0.6 ? `${Math.floor(Math.random() * 72) + 1}h` : '-',
      children: selectedBrokers
    };
  };

  // Generate 50 orders
  const orders: OrderData[] = [];
  for (let i = 0; i < 50; i++) {
    orders.push(generateOrder());
  }

  return orders;
};

function TradeDesk() {
  const [showInsights, setShowInsights] = useState(true);

  // Memoize trade data to prevent regenerating on every render
  const tradeData = useMemo(() => generateMultiLevelOrderData(), []);

  // Memoize columns to prevent unnecessary re-renders
  const orderColumns: ColumnDef<OrderData>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="font-mono text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('id')}
        </div>
      ),
    },
    {
      accessorKey: 'counterparty',
      header: 'Counterparty',
      cell: ({ row }) => {
        const isBroker = row.original.isBrokerGroup;
        return (
          <div className={cn(
            isBroker ? 'font-medium text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
          )}>
            {row.getValue('counterparty')}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const value = row.getValue('type') as string;
        return value ? <div className="text-center">{value}</div> : null;
      },
    },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ row }) => {
        const stage = row.getValue('stage') as string;
        if (!stage) return null;
        return (
          <Badge variant={stage === 'Active' ? 'default' : 'secondary'} className="text-caption-sm">
            {stage}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'laycan',
      header: 'Laycan',
      cell: ({ row }) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('laycan')}
        </div>
      ),
    },
    {
      accessorKey: 'vessel',
      header: 'Vessel',
      cell: ({ row }) => {
        const vessel = row.getValue('vessel') as string;
        const isOptions = vessel?.includes('options');
        return (
          <div className={cn(
            'text-body-sm',
            isOptions ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
          )}>
            {vessel}
          </div>
        );
      },
    },
    {
      accessorKey: 'lastBid',
      header: 'Last bid',
      cell: ({ row }) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('lastBid')}
        </div>
      ),
    },
    {
      accessorKey: 'lastOffer',
      header: 'Last offer',
      cell: ({ row }) => (
        <div className="text-body-sm font-medium text-[var(--color-text-primary)]">
          {row.getValue('lastOffer')}
        </div>
      ),
    },
    {
      accessorKey: 'demurrage',
      header: 'Demurrage',
      cell: ({ row }) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('demurrage')}
        </div>
      ),
    },
    {
      accessorKey: 'tce',
      header: 'TCE',
      cell: ({ row }) => {
        const value = row.getValue('tce') as string;
        return (
          <div className="text-body-sm text-[var(--color-text-primary)]">
            {value || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'validity',
      header: 'Validity',
      cell: ({ row }) => {
        const value = row.getValue('validity') as string;
        return (
          <div className="text-body-sm text-[var(--color-text-primary)]">
            {value || '-'}
          </div>
        );
      },
    },
  ], []);

  return (
    <>
      <style>{`
        .trade-desk-container {
          container-type: inline-size;
        }

        .btn-negotiation-full { display: inline; }
        .btn-negotiation-short { display: none; }
        .btn-order-full { display: inline; }
        .btn-order-short { display: none; }
        .insights-label { display: inline; }
        .insights-icon { display: none; }

        @container (max-width: 600px) {
          .btn-negotiation-full { display: none; }
          .btn-negotiation-short { display: inline; }
          .btn-order-full { display: none; }
          .btn-order-short { display: inline; }
          .insights-label { display: none; }
          .insights-icon { display: inline; }
        }
      `}</style>

      <div className="trade-desk-container space-y-6 overflow-x-hidden max-w-full min-w-0" style={{ padding: 'var(--page-padding)' }}>
        {/* Header with Title and Buttons */}
        <div className="flex items-center justify-between gap-4 min-w-0 overflow-hidden">
          <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)] shrink-0">
            Trade desk
          </h1>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <Switch checked={showInsights} onCheckedChange={setShowInsights} />
              <span className="insights-label text-body-md font-medium text-[var(--color-text-primary)]">
                Insights
              </span>
              <Icon name="chart-line" size="md" className="insights-icon" />
            </div>
            <div className="mx-2 h-1 w-1 rounded-full bg-[var(--color-text-tertiary)]"></div>
            <Button variant="secondary" icon="plus" iconPosition="left" className="whitespace-nowrap">
              <span className="btn-negotiation-full">New negotiation</span>
              <span className="btn-negotiation-short">Negotiation</span>
            </Button>
            <Button variant="primary" icon="plus" iconPosition="left" className="whitespace-nowrap">
              <span className="btn-order-full">New order</span>
              <span className="btn-order-short">Order</span>
            </Button>
          </div>
        </div>

      {/* Insights Section */}
      {showInsights && (
        <div className="space-y-4">
          <InsightsSection />
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" icon="filter" iconPosition="left" className="shrink-0">
          Filters
        </Button>
        <Button className="whitespace-nowrap shrink-0">
          <span className="hidden sm:inline">All negotiations</span>
          <span className="sm:hidden">All</span>
          <Icon name="chevron-down" size="sm" className="ml-1" />
        </Button>
        <Button className="shrink-0">
          Stage
          <Icon name="chevron-down" size="sm" className="ml-1" />
        </Button>
        <Button className="shrink-0">
          Validity
          <Icon name="chevron-down" size="sm" className="ml-1" />
        </Button>
        <Button className="whitespace-nowrap shrink-0">
          <Icon name="calendar" size="sm" className="mr-2" />
          <span className="hidden xl:inline">Jan 20, 2025 - Nov 30, 2025</span>
          <span className="hidden lg:inline xl:hidden">Jan 20 - Nov 30</span>
          <span className="hidden md:inline lg:hidden">2025</span>
          <span className="md:hidden">Date</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="md" icon="more-horizontal" className="shrink-0 ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-w-[90vw]">
            <div className="p-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-label-sm text-[var(--color-text-tertiary)]">
                    Sorting
                  </h4>
                  <Select>
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="Select column to sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">ID</SelectItem>
                      <SelectItem value="counterparty">Counterparty</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="laycan">Laycan</SelectItem>
                      <SelectItem value="vessel">Vessel</SelectItem>
                      <SelectItem value="lastBid">Last bid</SelectItem>
                      <SelectItem value="lastOffer">Last offer</SelectItem>
                      <SelectItem value="tce">TCE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h4 className="text-label-sm text-[var(--color-text-tertiary)]">
                    Grouping
                  </h4>
                  <Select>
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="Select column to group by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counterparty">Counterparty</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="vessel">Vessel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="p-3">
              <div className="space-y-2">
                <h4 className="text-label-sm text-[var(--color-text-tertiary)]">
                  Display columns
                </h4>
                <div className="flex flex-wrap items-start justify-start gap-1">
                  <Toggle variant="outline" size="sm" pressed={true}>ID</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Counterparty</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Type</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Stage</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Laycan</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Vessel</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Last bid</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>Last offer</Toggle>
                  <Toggle variant="outline" size="sm" pressed={false}>Demurrage</Toggle>
                  <Toggle variant="outline" size="sm" pressed={true}>TCE</Toggle>
                  <Toggle variant="outline" size="sm" pressed={false}>Validity</Toggle>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <DataTable
        data={tradeData}
        columns={orderColumns}
        enableExpanding={true}
        getSubRows={(row) => row.children}
        borderStyle="horizontal"
        autoExpandChildren={true}
        showHeader={false}
        renderSectionHeaderRow={(row) => {
          // Check if this row is a broker group (Level 2)
          if (row.original.isBrokerGroup) {
            const broker = row.original.counterparty;
            const canExpand = row.getCanExpand();
            const isExpanded = row.getIsExpanded();

            return (
              <div className="flex items-center gap-[var(--space-sm)] h-7 px-[var(--space-md)] pl-[var(--space-xlg)]">
                {canExpand && (
                  <button
                    onClick={row.getToggleExpandedHandler()}
                    className="flex h-[var(--size-sm)] w-[var(--size-sm)] items-center justify-center rounded-sm text-[var(--color-text-secondary)] hover:bg-[var(--blue-100)] hover:text-[var(--color-text-primary)]"
                  >
                    <Icon
                      name={isExpanded ? "chevron-down" : "chevron-right"}
                      className="h-3 w-3"
                    />
                  </button>
                )}
                <span className="text-body-strong-sm text-[var(--color-text-secondary)]">
                  {broker}
                </span>
              </div>
            );
          }
          return null;
        }}
      />
      </div>
    </>
  );
}

export default TradeDesk;
