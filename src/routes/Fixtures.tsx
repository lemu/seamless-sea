import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Filters,
  Icon,
  cn,
} from "@rafal.lemieszewski/tide-ui";
import type { FilterDefinition, FilterValue } from "@rafal.lemieszewski/tide-ui";

// Define types for fixture structure
interface FixtureData {
  id: string;
  fixtureId: string;
  orderId?: string;
  cpId: string;
  stage: string;
  typeOfContract: string;
  negotiationId: string;
  vessels: string;
  personInCharge: string;
  status: string;
  approvalStatus: string;
  owner: string;
  broker: string;
  charterer: string;
  lastUpdated: string;
  children?: FixtureData[];
}

// Generate mock fixture data based on Figma
const generateFixtureData = (): FixtureData[] => {
  const stages = ['Charter Party', 'Addenda', 'Negotiation', 'COA'];
  const contractTypes = ['Voyage charter', 'TC', 'COA'];
  const vessels = ['Kosta', 'TBN', 'Gisgo', 'Xin Yue Yang', 'Maran Glory', 'Judd', 'Buk Ara', 'Kymopolia', 'Lia Nangli', 'Gaia I', 'Dignity', 'Bacon', 'Navios Sakura', 'Dong Yuan'];
  const people = ['John Doe', 'Martin Leake'];
  const statuses = ['Final', 'On Subs', 'Firm bid', 'Working Copy', 'Draft', 'Firm offer', 'Firm bxd', 'Indicative offer'];
  const approvalStatuses = ['Signed', 'Not started', 'Pending approval', 'Pending signature', 'Approved'];
  const owners = ['Owning Company A', 'Owning Company B', 'Owning Company C'];
  const brokers = ['Broking Company A', 'Broking Company B', 'Broking Company C'];
  const charterers = ['Chartering Company A', 'Chartering Company B', 'Chartering Company C', 'Chartering Company D'];

  const generateId = (prefix: string) => {
    const num = Math.floor(Math.random() * 100000);
    return `${prefix}${num.toString().padStart(5, '0')}`;
  };

  const generateNegotiationId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const generateDate = () => {
    const day = Math.floor(Math.random() * 11) + 17; // 17-27
    const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    return `${day} Oct 2025 ${hours}:${minutes}`;
  };

  const fixtures: FixtureData[] = [];

  // Generate 150 fixtures
  for (let i = 0; i < 150; i++) {
    const hasMultipleContracts = Math.random() > 0.6; // 40% have multiple contracts
    // Multiple contracts always require an order, single contracts may not have one
    const hasOrder = hasMultipleContracts ? true : Math.random() > 0.5;

    if (hasMultipleContracts) {
      // Create fixture with multiple contracts
      const numContracts = Math.floor(Math.random() * 2) + 2; // 2-3 contracts
      const children: FixtureData[] = [];

      const fixtureId = generateId('FIX');
      const orderId = generateId('ORD'); // Always have order ID for multiple contracts

      for (let j = 0; j < numContracts; j++) {
        children.push({
          id: `contract-${i}-${j}`,
          fixtureId,
          orderId,
          cpId: generateId('30'),
          stage: stages[Math.floor(Math.random() * stages.length)],
          typeOfContract: contractTypes[Math.floor(Math.random() * contractTypes.length)],
          negotiationId: Math.random() > 0.1 ? generateNegotiationId() : '-',
          vessels: vessels[Math.floor(Math.random() * vessels.length)],
          personInCharge: people[Math.floor(Math.random() * people.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          approvalStatus: approvalStatuses[Math.floor(Math.random() * approvalStatuses.length)],
          owner: owners[Math.floor(Math.random() * owners.length)],
          broker: brokers[Math.floor(Math.random() * brokers.length)],
          charterer: charterers[Math.floor(Math.random() * charterers.length)],
          lastUpdated: generateDate(),
        });
      }

      fixtures.push({
        id: `fixture-${i}`,
        fixtureId,
        orderId,
        cpId: `${numContracts} contracts`,
        stage: stages[Math.floor(Math.random() * stages.length)],
        typeOfContract: contractTypes[Math.floor(Math.random() * contractTypes.length)],
        negotiationId: Math.random() > 0.1 ? generateNegotiationId() : '-',
        vessels: vessels[Math.floor(Math.random() * vessels.length)],
        personInCharge: people[Math.floor(Math.random() * people.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        approvalStatus: approvalStatuses[Math.floor(Math.random() * approvalStatuses.length)],
        owner: owners[Math.floor(Math.random() * owners.length)],
        broker: brokers[Math.floor(Math.random() * brokers.length)],
        charterer: charterers[Math.floor(Math.random() * charterers.length)],
        lastUpdated: generateDate(),
        children,
      });
    } else {
      // Single contract fixture
      fixtures.push({
        id: `fixture-${i}`,
        fixtureId: generateId('FIX'),
        orderId: hasOrder ? generateId('ORD') : undefined,
        cpId: generateId('30'),
        stage: stages[Math.floor(Math.random() * stages.length)],
        typeOfContract: contractTypes[Math.floor(Math.random() * contractTypes.length)],
        negotiationId: Math.random() > 0.1 ? generateNegotiationId() : '-',
        vessels: vessels[Math.floor(Math.random() * vessels.length)],
        personInCharge: people[Math.floor(Math.random() * people.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        approvalStatus: approvalStatuses[Math.floor(Math.random() * approvalStatuses.length)],
        owner: owners[Math.floor(Math.random() * owners.length)],
        broker: brokers[Math.floor(Math.random() * brokers.length)],
        charterer: charterers[Math.floor(Math.random() * charterers.length)],
        lastUpdated: generateDate(),
      });
    }
  }

  return fixtures;
};

// Fixture Sidebar Component
function FixtureSidebar({
  fixture,
  onClose
}: {
  fixture: FixtureData;
  onClose: () => void;
}) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-lg z-50 flex flex-col border-l border-[var(--color-border-primary-subtle)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-primary-subtle)]">
          <h2 className="text-heading-md font-bold text-[var(--color-text-primary)]">
            Fixture {fixture.cpId}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon="x"
            onClick={onClose}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="px-6 py-4 my-4">
            <TabsTrigger value="details">Fixture details</TabsTrigger>
            <TabsTrigger value="activity">Activity log</TabsTrigger>
          </TabsList>

          {/* Fixture Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-6 mt-6">
            <div className="space-y-6">
              {/* Order Section */}
              <div className="space-y-3">
                <h3 className="text-heading-sm font-semibold text-[var(--color-text-primary)]">
                  Order
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Order ID</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.orderId || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Negotiation ID</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.negotiationId}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Person in charge</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.personInCharge}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recap Section */}
              <div className="space-y-3">
                <h3 className="text-heading-sm font-semibold text-[var(--color-text-primary)]">
                  Recap
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Stage</span>
                    <Badge variant="secondary" className="text-caption-sm">
                      {fixture.stage}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Status</span>
                    <Badge variant="default" className="text-caption-sm">
                      {fixture.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Vessel(s)</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.vessels}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Last updated</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contract Section */}
              <div className="space-y-3">
                <h3 className="text-heading-sm font-semibold text-[var(--color-text-primary)]">
                  Contract
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">CP ID</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.cpId}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Type of contract</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.typeOfContract}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Approval status</span>
                    <Badge variant="secondary" className="text-caption-sm">
                      {fixture.approvalStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Owner</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.owner}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Broker</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.broker}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-body-sm text-[var(--color-text-secondary)]">Charterer</span>
                    <span className="text-body-sm font-medium text-[var(--color-text-primary)]">
                      {fixture.charterer}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="flex-1 overflow-y-auto px-6 pb-6 mt-6">
            <div className="flex items-center justify-center h-full">
              <p className="text-body-md text-[var(--color-text-secondary)]">
                Chronological events go here
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Fixtures() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureData | null>(null);

  // Memoize fixture data
  const fixtureData = useMemo(() => generateFixtureData(), []);

  // Filter state
  const [pinnedFilters, setPinnedFilters] = useState<string[]>(['vessels', 'status']);
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterValue>>({});

  // Extract unique values for filters
  const uniqueVessels = useMemo(() => {
    const vessels = new Set<string>();
    fixtureData.forEach(fixture => {
      if (!fixture.vessels.includes('contracts')) {
        vessels.add(fixture.vessels);
      }
      fixture.children?.forEach(child => {
        if (!child.vessels.includes('contracts')) {
          vessels.add(child.vessels);
        }
      });
    });
    return Array.from(vessels).sort().map(v => ({ value: v, label: v }));
  }, [fixtureData]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach(fixture => {
      statuses.add(fixture.status);
      fixture.children?.forEach(child => statuses.add(child.status));
    });
    return Array.from(statuses).sort().map(s => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    fixtureData.forEach(fixture => {
      owners.add(fixture.owner);
      fixture.children?.forEach(child => owners.add(child.owner));
    });
    return Array.from(owners).sort().map(o => ({ value: o, label: o }));
  }, [fixtureData]);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set<string>();
    fixtureData.forEach(fixture => {
      brokers.add(fixture.broker);
      fixture.children?.forEach(child => brokers.add(child.broker));
    });
    return Array.from(brokers).sort().map(b => ({ value: b, label: b }));
  }, [fixtureData]);

  const uniqueCharterers = useMemo(() => {
    const charterers = new Set<string>();
    fixtureData.forEach(fixture => {
      charterers.add(fixture.charterer);
      fixture.children?.forEach(child => charterers.add(child.charterer));
    });
    return Array.from(charterers).sort().map(c => ({ value: c, label: c }));
  }, [fixtureData]);


  // Define filter definitions
  const filterDefinitions: FilterDefinition[] = useMemo(() => [
    {
      id: 'vessels',
      label: 'Vessel',
      icon: ({ className }) => <Icon name="ship" className={className} />,
      type: 'multiselect',
      options: uniqueVessels,
      searchPlaceholder: 'Search vessels...',
    },
    {
      id: 'status',
      label: 'Status',
      icon: ({ className }) => <Icon name="file-text" className={className} />,
      type: 'multiselect',
      options: uniqueStatuses,
      searchPlaceholder: 'Search statuses...',
    },
    {
      id: 'owner',
      label: 'Owner',
      icon: ({ className }) => <Icon name="building" className={className} />,
      type: 'multiselect',
      options: uniqueOwners,
      searchPlaceholder: 'Search owners...',
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
      id: 'charterer',
      label: 'Charterer',
      icon: ({ className }) => <Icon name="user" className={className} />,
      type: 'multiselect',
      options: uniqueCharterers,
      searchPlaceholder: 'Search charterers...',
    },
  ], [uniqueVessels, uniqueStatuses, uniqueOwners, uniqueBrokers, uniqueCharterers]);

  // Calculate date range based on filter
  const getDateRange = (filter: string): { from: Date; to: Date } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case "today":
        return { from: today, to: now };
      case "last7days":
        return { from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
      case "last30days":
        return { from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
      case "last90days":
        return { from: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), to: now };
      default:
        return null;
    }
  };

  // Filter data based on active filters
  const filteredData = useMemo(() => {
    return fixtureData.filter(fixture => {
      // Check each active filter
      for (const [filterId, filterValue] of Object.entries(activeFilters)) {
        if (!filterValue) continue;

        const values = Array.isArray(filterValue) ? filterValue : [filterValue];
        if (values.length === 0) continue;

        // Map filter ID to data property
        let itemValue: string;
        switch (filterId) {
          case 'vessels':
            itemValue = fixture.vessels;
            break;
          case 'status':
            itemValue = fixture.status;
            break;
          case 'owner':
            itemValue = fixture.owner;
            break;
          case 'broker':
            itemValue = fixture.broker;
            break;
          case 'charterer':
            itemValue = fixture.charterer;
            break;
          default:
            continue;
        }

        // Check if fixture or any of its children match
        const hasMatch = values.includes(String(itemValue)) ||
          fixture.children?.some(child => {
            let childValue: string;
            switch (filterId) {
              case 'vessels':
                childValue = child.vessels;
                break;
              case 'status':
                childValue = child.status;
                break;
              case 'owner':
                childValue = child.owner;
                break;
              case 'broker':
                childValue = child.broker;
                break;
              case 'charterer':
                childValue = child.charterer;
                break;
              default:
                return false;
            }
            return values.includes(String(childValue));
          });

        if (!hasMatch) return false;
      }

      return true;
    });
  }, [fixtureData, activeFilters]);

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

  // Memoize columns
  const fixtureColumns: ColumnDef<FixtureData>[] = useMemo(() => [
    {
      accessorKey: 'fixtureId',
      header: 'Fixture ID',
      cell: ({ row }: any) => {
        // Don't show Fixture ID on 2nd level (nested rows)
        if (row.depth === 1) {
          return null;
        }
        return (
          <button
            className="font-mono text-body-sm text-[var(--blue-600)] hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFixture(row.original);
            }}
          >
            {row.getValue('fixtureId')}
          </button>
        );
      },
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      cell: ({ row }: any) => {
        // Don't show Order ID on 2nd level (nested rows)
        if (row.depth === 1) {
          return null;
        }

        const value = row.getValue('orderId') as string | undefined;
        if (!value) {
          return <div className="text-body-sm text-[var(--color-text-secondary)]">-</div>;
        }
        return (
          <button
            className="font-mono text-body-sm text-[var(--blue-600)] hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              // Handle Order ID click if needed
            }}
          >
            {value}
          </button>
        );
      },
    },
    {
      accessorKey: 'cpId',
      header: 'CP ID',
      cell: ({ row }: any) => {
        const cpId = row.getValue('cpId') as string;
        const isContractCount = cpId?.includes('contracts');

        if (isContractCount) {
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {cpId}
            </div>
          );
        }

        return (
          <button
            className="font-mono text-body-sm text-[var(--blue-600)] hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              // Handle CP ID click if needed
            }}
          >
            {cpId}
          </button>
        );
      },
    },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('stage')}
        </div>
      ),
    },
    {
      accessorKey: 'typeOfContract',
      header: 'Type of contract',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('typeOfContract')}
        </div>
      ),
    },
    {
      accessorKey: 'vessels',
      header: 'Vessel(s)',
      cell: ({ row }: any) => {
        const vessels = row.getValue('vessels') as string;
        const isMultiple = vessels?.includes('contracts');
        return (
          <div className={cn(
            'text-body-sm',
            isMultiple ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
          )}>
            {vessels}
          </div>
        );
      },
    },
    {
      accessorKey: 'personInCharge',
      header: 'Person in charge',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('personInCharge')}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant="default" className="text-caption-sm">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'owner',
      header: 'Owner',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('owner')}
        </div>
      ),
    },
    {
      accessorKey: 'broker',
      header: 'Broker',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('broker')}
        </div>
      ),
    },
    {
      accessorKey: 'charterer',
      header: 'Charterer',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('charterer')}
        </div>
      ),
    },
    {
      accessorKey: 'lastUpdated',
      header: 'Last updated',
      cell: ({ row }: any) => (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {row.getValue('lastUpdated')}
        </div>
      ),
    },
  ], [setSelectedFixture]);

  return (
    <>
      <style>{`
        /* Target the entire row that contains a cell with extra padding-left */
        .fixtures-table tbody tr:has(td[style*="padding-left: calc"]) {
          background-color: var(--blue-50) !important;
        }

        /* Make sure all cells in the nested row get the background */
        .fixtures-table tbody tr:has(td[style*="padding-left: calc"]) td {
          background-color: var(--blue-50) !important;
        }
      `}</style>

      <div className="space-y-6 overflow-x-hidden max-w-full min-w-0" style={{ padding: 'var(--page-padding)' }}>
        {/* Header with Title */}
        <div className="flex items-center justify-between gap-4 min-w-0 overflow-hidden">
          <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)] shrink-0">
            Fixtures
          </h1>
        </div>

        {/* Filters */}
        <Filters
          filters={filterDefinitions}
          pinnedFilters={pinnedFilters}
          activeFilters={activeFilters}
          onPinnedFiltersChange={setPinnedFilters}
          onFilterChange={handleFilterChange}
          onFilterClear={handleFilterClear}
          onFilterReset={handleFilterReset}
        />

        {/* Data Table */}
        <div className="fixtures-table">
          <DataTable
            data={filteredData}
            columns={fixtureColumns}
            enableExpanding={true}
            getSubRows={(row: FixtureData) => row.children}
            borderStyle="horizontal"
            showHeader={false}
          />
        </div>

        {/* Sidebar */}
        {selectedFixture && (
          <FixtureSidebar
            fixture={selectedFixture}
            onClose={() => setSelectedFixture(null)}
          />
        )}
      </div>
    </>
  );
}

export default Fixtures;
