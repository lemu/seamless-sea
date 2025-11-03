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
  Filters,
  cn,
} from "@rafal.lemieszewski/tide-ui";
import type { FilterDefinition, FilterValue } from "@rafal.lemieszewski/tide-ui";
import { InsightsSection } from "../components/InsightsSection";

// Helper function for Badge appearance
const getStageBadgeProps = (
  stage: string
): { intent?: "neutral" | "brand" | "success" | "warning" | "destructive" | "information" | "violet" | "magenta"; appearance?: "solid" | "subtle" | "outline" } => {
  if (stage === 'Active') {
    return { intent: 'brand', appearance: 'subtle' };
  } else if (stage === 'Negotiating') {
    return { appearance: 'outline' };
  } else if (stage === 'Offer') {
    return { appearance: 'outline' };
  } else if (stage === 'Pending') {
    return { intent: 'neutral', appearance: 'subtle' };
  }
  return { intent: 'neutral', appearance: 'subtle' };
};

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

  // Filter state
  const [pinnedFilters, setPinnedFilters] = useState<string[]>(['stage', 'type']);
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterValue>>({});

  // Extract unique values for filters from all levels
  const uniqueCounterparties = useMemo(() => {
    const counterparties = new Set<string>();
    tradeData.forEach(order => {
      order.children?.forEach(brokerGroup => {
        brokerGroup.children?.forEach(offer => {
          if (offer.counterparty) {
            counterparties.add(offer.counterparty);
          }
        });
      });
    });
    return Array.from(counterparties).sort().map(c => ({ value: c, label: c }));
  }, [tradeData]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    tradeData.forEach(order => {
      if (order.type) types.add(order.type);
    });
    return Array.from(types).sort().map(t => ({ value: t, label: t }));
  }, [tradeData]);

  const uniqueStages = useMemo(() => {
    const stages = new Set<string>();
    tradeData.forEach(order => {
      order.children?.forEach(brokerGroup => {
        brokerGroup.children?.forEach(offer => {
          if (offer.stage) stages.add(offer.stage);
        });
      });
    });
    return Array.from(stages).sort().map(s => ({ value: s, label: s }));
  }, [tradeData]);

  const uniqueVessels = useMemo(() => {
    const vessels = new Set<string>();
    tradeData.forEach(order => {
      order.children?.forEach(brokerGroup => {
        brokerGroup.children?.forEach(offer => {
          if (offer.vessel && !offer.vessel.includes('options')) {
            vessels.add(offer.vessel);
          }
        });
      });
    });
    return Array.from(vessels).sort().map(v => ({ value: v, label: v }));
  }, [tradeData]);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set<string>();
    tradeData.forEach(order => {
      order.children?.forEach(brokerGroup => {
        if (brokerGroup.broker) brokers.add(brokerGroup.broker);
      });
    });
    return Array.from(brokers).sort().map(b => ({ value: b, label: b }));
  }, [tradeData]);

  // Date range options
  const dateRangeOptions = [
    { value: 'last-week', label: 'Last week' },
    { value: 'last-30-days', label: 'Last 30 days' },
    { value: 'this-month', label: 'This month' },
    { value: 'last-month', label: 'Last month' },
    { value: 'this-year', label: 'This year' },
    { value: 'last-year', label: 'Last year' },
  ];

  // Define filter definitions
  const filterDefinitions: FilterDefinition[] = useMemo(() => [
    {
      id: 'counterparty',
      label: 'Counterparty',
      icon: ({ className }) => <Icon name="building" className={className} />,
      type: 'multiselect',
      options: uniqueCounterparties,
      searchPlaceholder: 'Search counterparties...',
    },
    {
      id: 'type',
      label: 'Type',
      icon: ({ className }) => <Icon name="tag" className={className} />,
      type: 'multiselect',
      options: uniqueTypes,
      searchPlaceholder: 'Search types...',
    },
    {
      id: 'stage',
      label: 'Stage',
      icon: ({ className }) => <Icon name="layers" className={className} />,
      type: 'multiselect',
      options: uniqueStages,
      searchPlaceholder: 'Search stages...',
    },
    {
      id: 'vessel',
      label: 'Vessel',
      icon: ({ className }) => <Icon name="ship" className={className} />,
      type: 'multiselect',
      options: uniqueVessels,
      searchPlaceholder: 'Search vessels...',
    },
    {
      id: 'broker',
      label: 'Broker',
      icon: ({ className }) => <Icon name="briefcase" className={className} />,
      type: 'multiselect',
      options: uniqueBrokers,
      searchPlaceholder: 'Search brokers...',
    },
    {
      id: 'laycan',
      label: 'Laycan',
      icon: ({ className }) => <Icon name="calendar" className={className} />,
      type: 'select',
      options: dateRangeOptions,
    },
  ], [uniqueCounterparties, uniqueTypes, uniqueStages, uniqueVessels, uniqueBrokers]);

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
      sectionHeaderCell: ({ row }) => {
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
      },
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
        const badgeProps = getStageBadgeProps(stage);
        return (
          <Badge {...badgeProps} className="text-caption-sm">
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

  // Helper function to parse laycan date and check if it's within range
  const parseLaycanDate = (laycan: string): Date | null => {
    try {
      // Laycan format: "1 Jan 2025 — 6 Jan 2025"
      const startDate = laycan.split('—')[0].trim();
      const parts = startDate.split(' ');
      const day = parseInt(parts[0]);
      const monthName = parts[1];
      const year = parseInt(parts[2]);
      const monthMap: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      return new Date(year, monthMap[monthName], day);
    } catch {
      return null;
    }
  };

  const getDateRangeForFilter = (filterValue: string): { from: Date; to: Date } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filterValue) {
      case 'last-week': {
        const from = new Date(today);
        from.setDate(from.getDate() - 7);
        return { from, to: today };
      }
      case 'last-30-days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 30);
        return { from, to: today };
      }
      case 'this-month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from, to: today };
      }
      case 'last-month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from, to };
      }
      case 'this-year': {
        const from = new Date(now.getFullYear(), 0, 1);
        return { from, to: today };
      }
      case 'last-year': {
        const from = new Date(now.getFullYear() - 1, 0, 1);
        const to = new Date(now.getFullYear() - 1, 11, 31);
        return { from, to };
      }
      default:
        return null;
    }
  };

  // Filter data based on active filters
  const filteredData = useMemo(() => {
    if (Object.keys(activeFilters).length === 0) {
      return tradeData;
    }

    return tradeData.map(order => {
      // Check if order or any of its children match the filters
      let hasMatchingChildren = false;

      const filteredBrokerGroups = order.children?.map(brokerGroup => {
        const filteredOffers = brokerGroup.children?.filter(offer => {
          // Check each active filter
          for (const [filterId, filterValue] of Object.entries(activeFilters)) {
            if (!filterValue) continue;

            const values = Array.isArray(filterValue) ? filterValue : [filterValue];
            if (values.length === 0) continue;

            // Check filter matches
            switch (filterId) {
              case 'counterparty':
                if (!values.includes(offer.counterparty)) return false;
                break;
              case 'type':
                if (!values.includes(order.type)) return false;
                break;
              case 'stage':
                if (!values.includes(offer.stage)) return false;
                break;
              case 'vessel':
                if (!values.includes(offer.vessel)) return false;
                break;
              case 'broker':
                if (!values.includes(brokerGroup.broker || '')) return false;
                break;
              case 'laycan': {
                const range = getDateRangeForFilter(values[0] as string);
                if (range) {
                  const laycanDate = parseLaycanDate(offer.laycan);
                  if (!laycanDate || laycanDate < range.from || laycanDate > range.to) {
                    return false;
                  }
                }
                break;
              }
            }
          }
          return true;
        });

        if (filteredOffers && filteredOffers.length > 0) {
          hasMatchingChildren = true;
          return { ...brokerGroup, children: filteredOffers };
        }
        return null;
      }).filter(Boolean) as OrderData[];

      if (hasMatchingChildren && filteredBrokerGroups.length > 0) {
        return { ...order, children: filteredBrokerGroups };
      }
      return null;
    }).filter(Boolean) as OrderData[];
  }, [tradeData, activeFilters]);

  const handleFilterChange = (filterId: string, value: FilterValue) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const handleFilterClear = (filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  };

  const handleFilterReset = () => {
    setActiveFilters({});
  };

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

      <div className="trade-desk-container m-6 space-y-6 overflow-x-hidden max-w-full min-w-0" style={{ padding: 'var(--page-padding)' }}>
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

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filters
          filters={filterDefinitions}
          pinnedFilters={pinnedFilters}
          activeFilters={activeFilters}
          onPinnedFiltersChange={setPinnedFilters}
          onFilterChange={handleFilterChange}
          onFilterClear={handleFilterClear}
          onFilterReset={handleFilterReset}
        />

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
        data={filteredData}
        columns={orderColumns}
        enableExpanding={true}
        getSubRows={(row) => row.children}
        borderStyle="horizontal"
        autoExpandChildren={true}
        showHeader={false}
      />
      </div>
    </>
  );
}

export default TradeDesk;
