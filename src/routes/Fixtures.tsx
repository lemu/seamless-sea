import { useState, useMemo, useEffect } from "react";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type GroupingState,
  type ColumnOrderState,
  type ExpandedState,
} from "@tanstack/react-table";
import {
  DataTable,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Bookmarks,
  Filters,
  DataTableSettingsMenu,
  Separator,
  Icon,
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  FixtureStatus,
  Card,
  AttributesList,
  AttributesGroup,
  AttributesItem,
  AttributesRow,
  AttributesLabel,
  AttributesValue,
  AttributesSeparator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AttributesContent,
  AttributesChevron,
  ActivityLog,
  ActivityLogItem,
  ActivityLogTime,
  ActivityLogHeader,
  ActivityLogDescription,
  ActivityLogValue,
  Avatar,
  AvatarFallback,
  type FilterDefinition,
  type FilterValue,
  type Bookmark,
} from "@rafal.lemieszewski/tide-ui";

// Define types for fixture structure
interface FixtureData {
  id: string;
  fixtureId: string;
  orderId?: string;
  cpId?: string;
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
  lastUpdated: number;
}

// Define types for change history
interface ChangeHistoryEntry {
  timestamp: string;  // e.g., "Jul 27, 2025 at 15:01"
  user: {
    name: string;
    avatar?: string;
  };
  action: 'created' | 'updated';
  status: {
    value: string;  // e.g., "order-draft", "contract-working-copy"
    label: string;  // e.g., "order draft", "contract working copy"
  };
  value: string;  // The new value
}

// Define types for activity log
interface ActivityLogEntry {
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  description: string;
  status?: {
    value: string;
    label: string;
  };
  expandable?: {
    title: string;
    content: string;
  };
  icon?: string;
}

// Mock change history data for fixture fields
const mockChangeHistory: Record<string, ChangeHistoryEntry[]> = {
  charterer: [
    {
      timestamp: "Jul 27, 2025 at 15:01",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "ShipCo"
    },
    {
      timestamp: "Jul 14, 2025 at 9:37",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-draft", label: "contract draft" },
      value: "ShipCo Corporation"
    },
    {
      timestamp: "Jul 4, 2025 at 12:37",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "ShipCo Ltd."
    }
  ],
  broker: [
    {
      timestamp: "Jul 20, 2025 at 10:15",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "Simpson Spence Young"
    },
    {
      timestamp: "Jul 8, 2025 at 14:22",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "Clarksons"
    }
  ],
  owner: [
    {
      timestamp: "Jul 26, 2025 at 16:45",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "Acme Shipping"
    },
    {
      timestamp: "Jul 10, 2025 at 11:30",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "Acme Ltd."
    }
  ],
  cargo: [
    {
      timestamp: "Jul 25, 2025 at 13:20",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "Iron Ore • 150,000 mt"
    },
    {
      timestamp: "Jul 18, 2025 at 09:15",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-draft", label: "contract draft" },
      value: "Iron Ore • 155,000 mt"
    },
    {
      timestamp: "Jul 6, 2025 at 15:45",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "Iron Ore • 160,000 mt"
    }
  ],
  freightRate: [
    {
      timestamp: "Jul 24, 2025 at 14:30",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "22.50 $/mt"
    },
    {
      timestamp: "Jul 16, 2025 at 10:20",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-draft", label: "contract draft" },
      value: "24.00 $/mt"
    },
    {
      timestamp: "Jul 5, 2025 at 16:10",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "25.12 $/mt"
    }
  ],
  laycan: [
    {
      timestamp: "Jul 23, 2025 at 11:40",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "25th October, 2025 – 28th October, 2025"
    },
    {
      timestamp: "Jul 7, 2025 at 13:55",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "27th October, 2025 (0001 hrs) – 30th October, 2025 (2359 hrs)"
    }
  ],
  loadPort: [
    {
      timestamp: "Jul 22, 2025 at 09:30",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "Rio de Janeiro, BR"
    },
    {
      timestamp: "Jul 9, 2025 at 14:15",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "Tubarao, BR"
    }
  ],
  dischargePort: [
    {
      timestamp: "Jul 21, 2025 at 10:45",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      status: { value: "order-draft", label: "order draft" },
      value: "Shanghai, CN"
    },
    {
      timestamp: "Jul 11, 2025 at 15:30",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      status: { value: "contract-working-copy", label: "contract working copy" },
      value: "Qingdao or Tianjin, CN"
    }
  ]
};

// Mock activity log data
const mockActivityLog: { order: ActivityLogEntry[], contract: ActivityLogEntry[] } = {
  order: [
    {
      timestamp: "Jul 4, 2025 at 12:37",
      user: { name: "Rafał Lemieszewski" },
      action: "created",
      description: "created",
      status: { value: "order-draft", label: "order draft" }
    },
    {
      timestamp: "Jul 5, 2025 at 9:15",
      user: { name: "Rafał Lemieszewski" },
      action: "distributed",
      description: "distributed the order to the market",
      status: { value: "order-distributed", label: "order distributed" }
    },
    {
      timestamp: "Jul 6, 2025 at 13:36",
      user: { name: "Ivy Chu" },
      action: "sent",
      description: "sent",
      status: { value: "negotiation-indicative-bid", label: "indicative bid" }
    },
    {
      timestamp: "Jul 7, 2025 at 10:22",
      user: { name: "Rafał Lemieszewski" },
      action: "answered",
      description: "answered with",
      status: { value: "negotiation-indicative-offer", label: "indicative offer" }
    },
    {
      timestamp: "Jul 8, 2025 at 14:05",
      user: { name: "Ivy Chu" },
      action: "sent",
      description: "sent",
      status: { value: "negotiation-firm-bid", label: "firm bid" }
    },
    {
      timestamp: "Jul 9, 2025 at 7:53",
      user: { name: "Rafał Lemieszewski" },
      action: "accepted",
      description: "accepted firm bid. Offer is now",
      status: { value: "negotiation-firm", label: "firm" }
    },
    {
      timestamp: "Jul 9, 2025 at 15:30",
      user: { name: "Rafał Lemieszewski" },
      action: "went",
      description: "went",
      status: { value: "negotiation-on-subs", label: "on subs" }
    },
    {
      timestamp: "Jul 11, 2025 at 14:28",
      user: { name: "System" },
      action: "compliance",
      description: "Compliance check has finished with the result: compliant",
      icon: "check-circle"
    },
    {
      timestamp: "Jul 13, 2025 at 7:02",
      user: { name: "Rafał Lemieszewski" },
      action: "set",
      description: "set negotiation as",
      status: { value: "negotiation-fixed", label: "fixed" }
    }
  ],
  contract: [
    {
      timestamp: "Jul 12, 2025 at 7:02",
      user: { name: "System" },
      action: "created",
      description: "Contract was created",
      status: { value: "contract-draft", label: "draft" },
      icon: "file-text"
    },
    {
      timestamp: "Jul 12, 2025 at 14:30",
      user: { name: "Rafał Lemieszewski" },
      action: "updated",
      description: "made changes to contract",
      status: { value: "contract-draft", label: "draft" }
    },
    {
      timestamp: "Jul 12, 2025 at 18:15",
      user: { name: "Rafał Lemieszewski" },
      action: "changed",
      description: "changed contract status to",
      status: { value: "contract-working-copy", label: "working copy" }
    },
    {
      timestamp: "Jul 13, 2025 at 8:00",
      user: { name: "Rafał Lemieszewski" },
      action: "added",
      description: "added Ivy Chu • Acme as approver from Owner side"
    },
    {
      timestamp: "Jul 13, 2025 at 11:22",
      user: { name: "Rafał Lemieszewski" },
      action: "added",
      description: "added himself as approver from Charterer side"
    },
    {
      timestamp: "Jul 15, 2025 at 10:37",
      user: { name: "Ivy Chu • Acme" },
      action: "rejected",
      description: "rejected the contract with the following reason",
      expandable: {
        title: "Rejection reason",
        content: 'Please change clause §34: "Lorem ipsum dolor sit amet."'
      }
    },
    {
      timestamp: "Jul 16, 2025 at 16:00",
      user: { name: "Ivy Chu • Acme" },
      action: "approved",
      description: "approved contract"
    },
    {
      timestamp: "Jul 18, 2025 at 8:04",
      user: { name: "Rafał Lemieszewski" },
      action: "approved",
      description: "approved contract"
    },
    {
      timestamp: "Jul 18, 2025 at 14:30",
      user: { name: "System" },
      action: "changed",
      description: "Contract changed status to",
      status: { value: "contract-final", label: "final" },
      icon: "check-circle-2"
    }
  ]
};

// Generate mock fixture data based on Figma
const generateFixtureData = (): FixtureData[] => {
  const stages = ["Charter Party", "Addenda", "Negotiation", "COA"];
  const contractTypes = ["Voyage charter", "TC", "COA"];
  const vessels = [
    "Kosta",
    "TBN",
    "Gisgo",
    "Xin Yue Yang",
    "Maran Glory",
    "Judd",
    "Buk Ara",
    "Kymopolia",
    "Lia Nangli",
    "Gaia I",
    "Dignity",
    "Bacon",
    "Navios Sakura",
    "Dong Yuan",
  ];
  const people = ["John Doe", "Martin Leake"];
  const statuses = [
    "order-draft",
    "order-distributed",
    "order-withdrawn",
    "negotiation-indicative-offer",
    "negotiation-indicative-bid",
    "negotiation-firm-offer",
    "negotiation-firm-bid",
    "negotiation-firm",
    "negotiation-on-subs",
    "negotiation-fixed",
    "negotiation-withdrawn",
    "contract-draft",
    "contract-working-copy",
    "contract-final",
    "addenda-draft",
    "addenda-working-copy",
    "addenda-final",
  ];
  const approvalStatuses = [
    "Signed",
    "Not started",
    "Pending approval",
    "Pending signature",
    "Approved",
  ];
  const owners = ["Owning Company A", "Owning Company B", "Owning Company C"];
  const brokers = [
    "Broking Company A",
    "Broking Company B",
    "Broking Company C",
  ];
  const charterers = [
    "Chartering Company A",
    "Chartering Company B",
    "Chartering Company C",
    "Chartering Company D",
  ];

  const generateId = (prefix: string) => {
    const num = Math.floor(Math.random() * 100000);
    return `${prefix}${num.toString().padStart(5, "0")}`;
  };

  const generateNegotiationId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const generateTimestamp = () => {
    const day = Math.floor(Math.random() * 11) + 17; // 17-27
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    return new Date(2025, 9, day, hours, minutes).getTime(); // October is month 9 (0-indexed)
  };

  const fixtures: FixtureData[] = [];

  // Generate 150 fixture groups
  for (let i = 0; i < 150; i++) {
    const fixtureId = generateId("FIX");

    // Determine if this fixture has negotiations (80% have negotiations)
    const hasNegotiations = Math.random() > 0.2;

    // Determine number of negotiations (1-3 negotiations per fixture)
    const numNegotiations = hasNegotiations
      ? Math.floor(Math.random() * 3) + 1
      : 0;

    // If there are negotiations, there MUST be an order
    const orderId = hasNegotiations ? generateId("ORD") : undefined;

    if (hasNegotiations && numNegotiations > 0) {
      // Decide if negotiations have resulted in CPs (70% chance)
      // This applies to ALL negotiations in this order
      const hasCp = Math.random() > 0.3;

      // Create one contract per negotiation (1:1 relationship)
      for (let j = 0; j < numNegotiations; j++) {
        fixtures.push({
          id: `contract-${i}-${j}`,
          fixtureId,
          orderId,
          cpId: hasCp ? generateId("30") : undefined,
          negotiationId: generateNegotiationId(),
          stage: stages[Math.floor(Math.random() * stages.length)],
          typeOfContract:
            contractTypes[Math.floor(Math.random() * contractTypes.length)],
          vessels: vessels[Math.floor(Math.random() * vessels.length)],
          personInCharge: people[Math.floor(Math.random() * people.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          approvalStatus:
            approvalStatuses[
              Math.floor(Math.random() * approvalStatuses.length)
            ],
          owner: owners[Math.floor(Math.random() * owners.length)],
          broker: brokers[Math.floor(Math.random() * brokers.length)],
          charterer: charterers[Math.floor(Math.random() * charterers.length)],
          lastUpdated: generateTimestamp(),
        });
      }
    } else {
      // No negotiations - single contract without order or negotiation
      fixtures.push({
        id: `fixture-${i}`,
        fixtureId,
        orderId: undefined,
        cpId: generateId("30"),
        negotiationId: "-",
        stage: stages[Math.floor(Math.random() * stages.length)],
        typeOfContract:
          contractTypes[Math.floor(Math.random() * contractTypes.length)],
        vessels: vessels[Math.floor(Math.random() * vessels.length)],
        personInCharge: people[Math.floor(Math.random() * people.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        approvalStatus:
          approvalStatuses[Math.floor(Math.random() * approvalStatuses.length)],
        owner: owners[Math.floor(Math.random() * owners.length)],
        broker: brokers[Math.floor(Math.random() * brokers.length)],
        charterer: charterers[Math.floor(Math.random() * charterers.length)],
        lastUpdated: generateTimestamp(),
      });
    }
  }

  return fixtures;
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

// Fixture Sidebar Component
function FixtureSidebar({
  fixture,
  onClose,
}: {
  fixture: FixtureData;
  onClose: () => void;
}) {
  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 bg-[var(--color-surface-base)] p-0" style={{ width: '640px', maxWidth: '640px' }}>
        <SheetTitle className="sr-only">Fixture {fixture.id}</SheetTitle>

        <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-[var(--color-surface-primary)]">
            <div className="flex items-start justify-between px-6 pb-6 pt-6">
              <div className="flex flex-col gap-1">
                {/* Main title line with fixture ID and companies */}
                <div className="flex items-center gap-2 text-[20px] font-semibold leading-6 tracking-[-0.2px] text-[var(--color-text-primary)]">
                  <span>
                    {fixture.orderId && fixture.negotiationId
                      ? `${fixture.orderId} • ${fixture.negotiationId}`
                      : fixture.cpId || fixture.fixtureId}
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Icon name="building" size="sm" />
                      <span className="text-body-sm font-medium">ShipCo</span>
                    </div>
                    <span className="text-body-sm">×</span>
                    <div className="flex items-center gap-1">
                      <Icon name="building" size="sm" />
                      <span className="text-body-sm font-medium">Acme</span>
                    </div>
                  </div>
                </div>

                {/* Metadata line with route and cargo */}
                <div className="flex items-center gap-1 text-body-xsm text-[var(--color-text-secondary)]">
                  <span className="font-semibold">🇧🇷</span>
                  <span>Tubarao, BR</span>
                  <Icon name="arrow-right" size="sm" />
                  <span className="font-semibold">🇨🇳</span>
                  <span>Qingdao, CN</span>
                  <span>•</span>
                  <span>240,000 mt coal</span>
                  <span>•</span>
                  <span>June 12 – Aug 26 2025</span>
                </div>
              </div>
              <SheetClose />
            </div>

            {/* Tab Navigation */}
            <TabsList variant="line" fullWidth>
              <TabsTrigger variant="line" fullWidth value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger variant="line" fullWidth value="activity">
                Activity Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          {/* Overview Tab */}
          <TabsContent
            value="overview"
            className="mt-0 flex-1 overflow-y-auto bg-[var(--color-surface-base)]"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {/* Sorting Toolbar */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-body-sm text-[var(--color-text-secondary)]">Sorting</span>
                <Select defaultValue="newest-first">
                  <SelectTrigger className="w-[120px]" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest-first">Newest first</SelectItem>
                    <SelectItem value="oldest-first">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Card */}
              <Card className="p-6">
                <h3 className="mb-4 text-body-lg font-semibold text-[var(--color-text-primary)]">Status</h3>
                <AttributesList style={{ gridTemplateColumns: 'minmax(140px, auto) 1fr auto' }}>
                  <AttributesGroup label="Deal with Acme">
                      <AttributesItem>
                        <AttributesRow externalLink={{
                          href: "/negotiation",
                          label: "Go to negotiation"
                        }}>
                          <AttributesLabel>Negotiation</AttributesLabel>
                          <AttributesValue>
                            <FixtureStatus value="negotiation-fixed" size="xsm" />
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>

                      <AttributesItem>
                        <AttributesRow externalLink={{
                          href: "/contract",
                          label: "Go to contract"
                        }}>
                          <AttributesLabel>Contract</AttributesLabel>
                          <AttributesValue>
                            <FixtureStatus value="contract-working-copy" size="xsm" />
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>

                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Approval</AttributesLabel>
                          <AttributesValue>1/2 approved</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    </AttributesGroup>
                </AttributesList>
              </Card>

              {/* Fixture Specification Card */}
              <Card className="p-6">
                <h3 className="mb-4 text-body-lg font-semibold text-[var(--color-text-primary)]">Fixture specification</h3>
                <AttributesList style={{ gridTemplateColumns: 'minmax(140px, auto) 1fr' }}>
                  <AttributesGroup label="Involved Parties">
                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Charterer</AttributesLabel>
                        <AttributesValue>
                          <Icon name="building" size="sm" />
                          ShipCo Ltd.
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.charterer.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Charterer to' : 'changed Charterer from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>

                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Broker</AttributesLabel>
                        <AttributesValue>
                          <Icon name="building" size="sm" />
                          Clarksons
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.broker.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Broker to' : 'changed Broker from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>

                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Owner</AttributesLabel>
                        <AttributesValue>
                          <Icon name="building" size="sm" />
                          Acme Ltd.
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.owner.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Owner to' : 'changed Owner from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Vessel" showHiddenLabel="More details" hideLabel="Less details">
                    <AttributesItem>
                      <AttributesRow>
                        <AttributesLabel>Vessel name</AttributesLabel>
                        <AttributesValue>Ever Given</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem>
                      <AttributesRow>
                        <AttributesLabel>IMO Number</AttributesLabel>
                        <AttributesValue>9811000</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Callsign</AttributesLabel>
                        <AttributesValue>H3RC</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Built date</AttributesLabel>
                        <AttributesValue>25th September, 2018</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>GRT</AttributesLabel>
                        <AttributesValue>220,940 mt</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Flag</AttributesLabel>
                        <AttributesValue>Panama</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Class</AttributesLabel>
                        <AttributesValue>G class</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>DWT</AttributesLabel>
                        <AttributesValue>99,155 mt</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Draft</AttributesLabel>
                        <AttributesValue>14.5 m</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>LOA/Beam</AttributesLabel>
                        <AttributesValue>400 m • 59 m</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Max height</AttributesLabel>
                        <AttributesValue>60 m</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Speed & Consumption</AttributesLabel>
                        <AttributesValue>13.5 knots • 200,000 l/day</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Full CP chain</AttributesLabel>
                        <AttributesValue>Lorem Ipsum, Dolor Sit, Amet Consequeur</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Full itinerary</AttributesLabel>
                        <AttributesValue>Lorem Ipsum, Dolor Sit, Amet Consequeur</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Voyage">
                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Load Port</AttributesLabel>
                        <AttributesValue>
                          <span className="font-semibold">🇧🇷</span>
                          Tubarao, BR
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.loadPort.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Load Port to' : 'changed Load Port from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>

                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Discharge Port</AttributesLabel>
                        <AttributesValue>
                          <span className="font-semibold">🇨🇳</span>
                          Qingdao or Tianjin, CN
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.dischargePort.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Discharge Port to' : 'changed Discharge Port from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>

                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Cargo</AttributesLabel>
                        <AttributesValue>
                          Iron Ore • 160,000 mt
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.cargo.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Cargo to' : 'changed Cargo from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>

                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Laycan</AttributesLabel>
                        <AttributesValue>
                          27th October, 2025 (0001 hrs) – 30th October, 2025 (2359 hrs)
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.laycan.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Laycan to' : 'changed Laycan from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Financials" showHiddenLabel="More details" hideLabel="Less details">
                    <AttributesItem>
                      <AttributesRow>
                        <AttributesLabel>Fixture type</AttributesLabel>
                        <AttributesValue>Voyage charter (Spot)</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem collapsible defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger>
                        <AttributesLabel>Freight Rate</AttributesLabel>
                        <AttributesValue>
                          25.12 $/mt
                          <AttributesChevron />
                        </AttributesValue>
                      </AttributesRow>
                      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                          <ActivityLog>
                            {mockChangeHistory.freightRate.map((entry, index, arr) => {
                              const previousValue = index < arr.length - 1 ? arr[index + 1].value : null;
                              return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Freight Rate to' : 'changed Freight Rate from'}</span>
                                      {entry.action === 'updated' && previousValue && (
                                        <>
                                          <ActivityLogValue>{previousValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                    </ActivityLogDescription>
                                    <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              );
                            })}
                          </ActivityLog>
                        </div>
                      </AttributesContent>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Demurrage / Despatch</AttributesLabel>
                        <AttributesValue>20,000 $/m/day</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Address commission</AttributesLabel>
                        <AttributesValue>3.75%</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem hidden>
                      <AttributesRow>
                        <AttributesLabel>Broker commission</AttributesLabel>
                        <AttributesValue>1.25%</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Order notes">
                    <p className="text-body-xsm text-[var(--color-text-secondary)]">
                      Lorem ipsum dolor sit amet
                    </p>
                  </AttributesGroup>
                </AttributesList>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent
            value="activity"
            className="mt-0 flex-1 overflow-y-auto bg-[var(--color-surface-base)]"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {/* Toolbar */}
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm">
                  Show all changes
                </Button>
                <span className="text-body-sm text-[var(--color-text-secondary)]">•</span>
                <span className="text-body-sm text-[var(--color-text-primary)]">
                  Sorting
                </span>
                <Select defaultValue="oldest-last">
                  <SelectTrigger className="w-[120px]" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oldest-last">Oldest last</SelectItem>
                    <SelectItem value="oldest-first">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Negotiation Card */}
              <Card className="p-6">
                <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                  Negotiation
                </h3>
                <ActivityLog>
                  {mockActivityLog.order.map((entry, index) => {
                    const initials = entry.user.name === "System"
                      ? "S"
                      : entry.user.name.split(' ').map(n => n[0]).join('');

                    return (
                      <ActivityLogItem key={index}>
                        <ActivityLogHeader>
                          <Avatar size="xxs">
                            <AvatarFallback size="xxs">{initials}</AvatarFallback>
                          </Avatar>
                          <ActivityLogDescription>
                            <span className="text-body-medium-sm">{entry.user.name}</span>
                            <span>{entry.description}</span>
                            {entry.status && (
                              <FixtureStatus value={entry.status.value as any} size="sm" />
                            )}
                          </ActivityLogDescription>
                          <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                        </ActivityLogHeader>
                      </ActivityLogItem>
                    );
                  })}
                </ActivityLog>
              </Card>

              {/* Contract Card */}
              <Card className="p-6">
                <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                  Contract
                </h3>
                <ActivityLog>
                  {mockActivityLog.contract.map((entry, index) => {
                    const initials = entry.user.name === "System"
                      ? "S"
                      : entry.user.name.split(' ').map(n => n[0]).join('');

                    return (
                      <ActivityLogItem key={index} collapsible={!!entry.expandable}>
                        <ActivityLogHeader>
                          <Avatar size="xxs">
                            <AvatarFallback size="xxs">{initials}</AvatarFallback>
                          </Avatar>
                          <ActivityLogDescription>
                            <span className="text-body-medium-sm">{entry.user.name}</span>
                            <span>{entry.description}</span>
                            {entry.status && (
                              <FixtureStatus value={entry.status.value as any} size="sm" />
                            )}
                          </ActivityLogDescription>
                          <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                        </ActivityLogHeader>
                        {entry.expandable && (
                          <div className="mt-4 rounded bg-[var(--color-surface-sunken)] p-3">
                            <p className="text-body-sm text-[var(--color-text-secondary)]">
                              {entry.expandable.content}
                            </p>
                          </div>
                        )}
                      </ActivityLogItem>
                    );
                  })}
                </ActivityLog>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Fixtures() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureData | null>(
    null,
  );

  // Memoize fixture data
  const fixtureData = useMemo(() => generateFixtureData(), []);

  // Helper function to highlight search terms in text
  const highlightSearchTerms = (text: string, terms: string[]) => {
    if (!terms.length || !text) return text;

    // Create regex pattern for all terms (escape special regex characters)
    const pattern = terms
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const testRegex = new RegExp(`^(${pattern})$`, 'i');
      if (testRegex.test(part)) {
        return (
          <mark
            key={i}
            style={{
              backgroundColor: 'var(--yellow-200, #fef08a)',
              color: 'var(--color-text-primary, inherit)',
              borderRadius: '2px',
              padding: '0 2px'
            }}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // System bookmarks (read-only, configured via props)
  const systemBookmarks: Bookmark[] = [
    {
      id: "system-all",
      name: "All Fixtures",
      type: "system",
      isDefault: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: fixtureData.length,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: { fixtureId: false },
        grouping: ["fixtureId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
    {
      id: "system-negotiations",
      name: "Negotiations",
      type: "system",
      isDefault: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: fixtureData.length,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: { fixtureId: false },
        grouping: ["negotiationId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
    {
      id: "system-contracts",
      name: "Contracts",
      type: "system",
      isDefault: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      count: fixtureData.length,
      filtersState: {
        activeFilters: {},
        pinnedFilters: [],
        globalSearchTerms: [],
      },
      tableState: {
        sorting: [{ id: "lastUpdated", desc: true }],
        columnVisibility: { fixtureId: false },
        grouping: ["cpId"],
        columnOrder: [],
        columnSizing: {},
      },
    },
  ];

  // Initial user bookmarks
  const initialUserBookmarks: Bookmark[] = [];

  // State management
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialUserBookmarks);
  const [activeBookmarkId, setActiveBookmarkId] =
    useState<string>("system-all");

  // Filters state
  const [activeFilters, setActiveFilters] = useState<
    Record<string, FilterValue>
  >({});
  const [pinnedFilters, setPinnedFilters] = useState<string[]>([
    "vessels",
    "status",
  ]);
  const [globalPinnedFilters, setGlobalPinnedFilters] = useState<string[]>([
    "vessels",
    "status",
  ]);
  const [globalSearchTerms, setGlobalSearchTerms] = useState<string[]>([]);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Memoize columns
  const fixtureColumns: ColumnDef<FixtureData>[] = useMemo(
    () => [
      {
        accessorKey: "fixtureId",
        header: "Fixture ID",
        meta: { label: "Fixture ID", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: any) => {
          const value = row.getValue("fixtureId");
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFixture(row.original);
                  }}
                >
                  {highlightSearchTerms(value, globalSearchTerms)}
                </button>
              </TooltipTrigger>
              <TooltipContent>View fixture details</TooltipContent>
            </Tooltip>
          );
        },
        aggregatedCell: ({ row, table }: any) => {
          const count = row.subRows?.length || 0;
          const isGroupedByFixtureId = row.groupingColumnId === "fixtureId";
          const isFixtureIdHidden = table.getState().columnVisibility.fixtureId === false;

          // Only display Order ID when grouped by fixtureId AND fixtureId column is hidden
          if (isGroupedByFixtureId && isFixtureIdHidden) {
            const orderIds = row.subRows?.map((r: any) => r.original?.orderId).filter(Boolean) || [];
            const uniqueOrderIds = new Set(orderIds);

            if (uniqueOrderIds.size === 1 && orderIds.length > 0) {
              const commonOrderId = Array.from(uniqueOrderIds)[0];
              return (
                <div className="text-body-sm font-mono font-semibold text-[var(--color-text-primary)]">
                  {commonOrderId} ({count} {count === 1 ? "contract" : "contracts"})
                </div>
              );
            }
          }

          // Default: Show fixture ID
          return (
            <div className="text-body-sm font-medium text-[var(--color-text-primary)]">
              {row.getValue("fixtureId")} ({count} {count === 1 ? "contract" : "contracts"})
            </div>
          );
        },
      },
      {
        accessorKey: "orderId",
        header: "Order ID",
        meta: { label: "Order ID", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row, table }: any) => {
          // Grouped row (has subRows): Only show special display when grouped by fixtureId with it hidden
          if (row.subRows?.length > 0) {
            const isGroupedByFixtureId = row.groupingColumnId === "fixtureId";
            const isFixtureIdHidden = table.getState().columnVisibility.fixtureId === false;

            // Special case: Show order ID when grouped by fixtureId with fixtureId hidden
            if (isGroupedByFixtureId && isFixtureIdHidden) {
              const orderId = row.subRows[0]?.original?.orderId;
              const count = row.subRows?.length || 0;

              if (!orderId) {
                return (
                  <div className="text-body-sm text-[var(--color-text-secondary)]">
                    –
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-1.5">
                  <span className="text-body-sm font-mono font-semibold text-[var(--color-text-primary)]">
                    {orderId}
                  </span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-bg-secondary)] text-caption-sm font-medium text-[var(--color-text-secondary)]">
                    {count}
                  </span>
                </div>
              );
            }

            // For other groupings, don't render anything (let the grouped column show)
            return null;
          }

          // Leaf row: Use row.original to get actual order ID
          const value = row.original?.orderId;
          if (!value) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                -
              </div>
            );
          }
          return (
            <button
              className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                // Handle Order ID click if needed
              }}
            >
              {highlightSearchTerms(value, globalSearchTerms)}
            </button>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const orderId = row.subRows[0]?.original?.orderId;
          // Show bold when: (1) grouped by orderId OR (2) grouped by fixtureId (All Fixtures with orderId as display column)
          const isGroupedByOrderId = row.groupingColumnId === "orderId" || row.groupingColumnId === "fixtureId";

          if (!orderId) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          return (
            <div className={`text-body-sm font-mono ${isGroupedByOrderId ? 'font-semibold' : ''} text-[var(--color-text-primary)]`}>
              {orderId}
            </div>
          );
        },
      },
      {
        accessorKey: "negotiationId",
        header: "Negotiation ID",
        meta: { label: "Negotiation ID", align: "left" },
        enableGrouping: true,
        cell: ({ row }: any) => {
          const negotiationId = row.getValue("negotiationId") as string;
          if (negotiationId === "-") {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                -
              </div>
            );
          }
          return (
            <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
              {negotiationId}
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const negotiationIds = row.subRows.map((r: any) => r.original?.negotiationId).filter((id: string) => id && id !== "-");
          const uniqueNegotiationIds = Array.from(new Set(negotiationIds)) as string[];

          // No negotiation IDs - show em dash
          if (uniqueNegotiationIds.length === 0) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          // Single Negotiation ID - show the actual value
          if (uniqueNegotiationIds.length === 1) {
            return (
              <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
                {String(uniqueNegotiationIds[0])}
              </div>
            );
          }

          // Multiple Negotiation IDs - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueNegotiationIds.length} {uniqueNegotiationIds.length === 1 ? "negotiation" : "negotiations"}
            </div>
          );
        },
      },
      {
        accessorKey: "cpId",
        header: "CP ID",
        meta: { label: "CP ID", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: any) => {
          const cpId = row.getValue("cpId") as string;
          return (
            <button
              className="text-body-sm font-mono text-[var(--blue-600)] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                // Handle CP ID click if needed
              }}
            >
              {highlightSearchTerms(cpId, globalSearchTerms)}
            </button>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const cpIds = row.subRows.map((r: any) => r.original?.cpId).filter(Boolean);
          const uniqueCpIds = Array.from(new Set(cpIds)) as string[];

          // No CP IDs - show em dash
          if (uniqueCpIds.length === 0) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          // Single CP ID - show the actual value
          if (uniqueCpIds.length === 1) {
            return (
              <div className="text-body-sm font-mono text-[var(--color-text-primary)]">
                {String(uniqueCpIds[0])}
              </div>
            );
          }

          // Multiple CP IDs - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueCpIds.length} {uniqueCpIds.length === 1 ? "contract" : "contracts"}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { label: "Status", align: "left" },
        enableGrouping: true,
        cell: ({ row }: any) => {
          const status = row.getValue("status") as string;
          return (
            <div className="flex items-center overflow-visible">
              <FixtureStatus value={status as any} className="overflow-visible" />
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const uniqueStatuses = Array.from(new Set(row.subRows?.map((r: any) => r.original.status) || [])) as string[];

          // Single item group - show full status label without object prefix
          if (row.subRows?.length === 1) {
            return (
              <div className="flex items-center justify-start overflow-visible">
                <FixtureStatus value={uniqueStatuses[0] as any} showObject={false} className="overflow-visible" />
              </div>
            );
          }

          // Multiple items - show all unique status icons
          return (
            <div className="flex items-center justify-start gap-1 overflow-visible">
              {uniqueStatuses.map((status, index) => (
                <FixtureStatus key={index} value={status as any} iconOnly className="overflow-visible" />
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "vessels",
        header: "Vessel Name",
        meta: { label: "Vessel Name", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: any) => {
          const vessels = row.getValue("vessels") as string;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlightSearchTerms(vessels, globalSearchTerms)}
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const uniqueVessels = new Set(row.subRows?.map((r: any) => r.original.vessels) || []);

          // If only one unique vessel, show the name with highlighting
          if (uniqueVessels.size === 1) {
            const vessel = Array.from(uniqueVessels)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(vessel, globalSearchTerms)}
              </div>
            );
          }

          // Multiple vessels - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueVessels.size} vessels
            </div>
          );
        },
      },
      {
        accessorKey: "owner",
        header: "Owner",
        meta: { label: "Owner", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: any) => {
          const owner = row.getValue("owner") as string;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlightSearchTerms(owner, globalSearchTerms)}
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const uniqueOwners = new Set(row.subRows?.map((r: any) => r.original.owner) || []);

          // If only one unique owner, show the name with highlighting
          if (uniqueOwners.size === 1) {
            const owner = Array.from(uniqueOwners)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(owner, globalSearchTerms)}
              </div>
            );
          }

          // Multiple owners - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueOwners.size} owners
            </div>
          );
        },
      },
      {
        accessorKey: "broker",
        header: "Broker",
        meta: { label: "Broker", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: any) => {
          const broker = row.getValue("broker") as string;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlightSearchTerms(broker, globalSearchTerms)}
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const uniqueBrokers = new Set(row.subRows?.map((r: any) => r.original.broker) || []);

          // If only one unique broker, show the name with highlighting
          if (uniqueBrokers.size === 1) {
            const broker = Array.from(uniqueBrokers)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(broker, globalSearchTerms)}
              </div>
            );
          }

          // Multiple brokers - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueBrokers.size} brokers
            </div>
          );
        },
      },
      {
        accessorKey: "charterer",
        header: "Charterer",
        meta: { label: "Charterer", align: "left" },
        enableGrouping: true,
        enableGlobalFilter: true,
        cell: ({ row }: any) => {
          const charterer = row.getValue("charterer") as string;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {highlightSearchTerms(charterer, globalSearchTerms)}
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          const uniqueCharterers = new Set(row.subRows?.map((r: any) => r.original.charterer) || []);

          // If only one unique charterer, show the name with highlighting
          if (uniqueCharterers.size === 1) {
            const charterer = Array.from(uniqueCharterers)[0] as string;
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(charterer, globalSearchTerms)}
              </div>
            );
          }

          // Multiple charterers - show count
          return (
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              {uniqueCharterers.size} charterers
            </div>
          );
        },
      },
      {
        accessorKey: "lastUpdated",
        header: "Last Updated",
        meta: { label: "Last Updated", align: "left" },
        enableGrouping: false,
        aggregationFn: (columnId: string, leafRows: any[]) => {
          // For sorting: return the most recent (maximum) timestamp
          const timestamps = leafRows.map((row) => row.getValue(columnId)).filter(Boolean);
          return timestamps.length > 0 ? Math.max(...timestamps) : 0;
        },
        cell: ({ row }: any) => {
          const timestamp = row.getValue("lastUpdated") as number;
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {formatTimestamp(timestamp)}
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          // For grouped rows, show date range
          const timestamps = row.subRows?.map((r: any) => r.original?.lastUpdated).filter(Boolean) || [];
          if (timestamps.length === 0) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

          const earliest = Math.min(...timestamps);
          const latest = Math.max(...timestamps);

          // If all timestamps are the same, show single date
          if (earliest === latest) {
            return (
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {formatTimestamp(latest)}
              </div>
            );
          }

          // Show date range
          return (
            <div className="text-body-sm text-[var(--color-text-primary)]">
              {formatTimestamp(earliest)} – {formatTimestamp(latest)}
            </div>
          );
        },
      },
    ],
    [setSelectedFixture, columnVisibility, globalSearchTerms],
  );

  // Extract unique values for filters
  const uniqueVessels = useMemo(() => {
    const vessels = new Set<string>();
    fixtureData.forEach((fixture) => {
      vessels.add(fixture.vessels);
    });
    return Array.from(vessels)
      .sort()
      .map((v) => ({ value: v, label: v }));
  }, [fixtureData]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      statuses.add(fixture.status);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    fixtureData.forEach((fixture) => {
      owners.add(fixture.owner);
    });
    return Array.from(owners)
      .sort()
      .map((o) => ({ value: o, label: o }));
  }, [fixtureData]);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set<string>();
    fixtureData.forEach((fixture) => {
      brokers.add(fixture.broker);
    });
    return Array.from(brokers)
      .sort()
      .map((b) => ({ value: b, label: b }));
  }, [fixtureData]);

  const uniqueCharterers = useMemo(() => {
    const charterers = new Set<string>();
    fixtureData.forEach((fixture) => {
      charterers.add(fixture.charterer);
    });
    return Array.from(charterers)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [fixtureData]);

  const uniqueStages = useMemo(() => {
    const stages = new Set<string>();
    fixtureData.forEach((fixture) => {
      stages.add(fixture.stage);
    });
    return Array.from(stages)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  const uniqueContractTypes = useMemo(() => {
    const types = new Set<string>();
    fixtureData.forEach((fixture) => {
      types.add(fixture.typeOfContract);
    });
    return Array.from(types)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [fixtureData]);

  const uniqueApprovalStatuses = useMemo(() => {
    const statuses = new Set<string>();
    fixtureData.forEach((fixture) => {
      statuses.add(fixture.approvalStatus);
    });
    return Array.from(statuses)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [fixtureData]);

  // Define filter definitions
  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        id: "vessels",
        label: "Vessel",
        icon: ({ className }) => <Icon name="ship" className={className} />,
        type: "multiselect",
        options: uniqueVessels,
      },
      {
        id: "status",
        label: "Status",
        icon: ({ className }) => (
          <Icon name="file-text" className={className} />
        ),
        type: "multiselect",
        options: uniqueStatuses,
      },
      {
        id: "stage",
        label: "Stage",
        icon: ({ className }) => <Icon name="layers" className={className} />,
        type: "multiselect",
        options: uniqueStages,
      },
      {
        id: "typeOfContract",
        label: "Contract Type",
        icon: ({ className }) => (
          <Icon name="file-check" className={className} />
        ),
        type: "multiselect",
        options: uniqueContractTypes,
      },
      {
        id: "approvalStatus",
        label: "Approval Status",
        icon: ({ className }) => (
          <Icon name="check-circle" className={className} />
        ),
        type: "multiselect",
        options: uniqueApprovalStatuses,
      },
      {
        id: "owner",
        label: "Owner",
        icon: ({ className }) => <Icon name="building" className={className} />,
        type: "multiselect",
        options: uniqueOwners,
      },
      {
        id: "broker",
        label: "Broker",
        icon: ({ className }) => (
          <Icon name="briefcase" className={className} />
        ),
        type: "multiselect",
        options: uniqueBrokers,
      },
      {
        id: "charterer",
        label: "Charterer",
        icon: ({ className }) => <Icon name="user" className={className} />,
        type: "multiselect",
        options: uniqueCharterers,
      },
    ],
    [
      uniqueVessels,
      uniqueStatuses,
      uniqueStages,
      uniqueContractTypes,
      uniqueApprovalStatuses,
      uniqueOwners,
      uniqueBrokers,
      uniqueCharterers,
    ],
  );

  // Helper function to calculate count for a bookmark
  const calculateBookmarkCount = (bookmark: Bookmark): number => {
    if (!bookmark.filtersState) return fixtureData.length;

    // Step 1: Apply bookmark and field filters (non-search filters)
    let data = fixtureData.filter((fixture) => {
      // Special filter for Negotiations bookmark: exclude fixtures without negotiation IDs
      if (bookmark.id === "system-negotiations") {
        if (!fixture.negotiationId || fixture.negotiationId === "-") {
          return false;
        }
      }

      // Apply active filters from bookmark
      if (bookmark.filtersState) {
        for (const [filterId, filterValue] of Object.entries(
          bookmark.filtersState.activeFilters,
        )) {
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            const fixtureValue = String(
              fixture[filterId as keyof typeof fixture] || "",
            );
            const match = filterValue.some((val) =>
              fixtureValue.toLowerCase().includes(String(val).toLowerCase()),
            );
            if (!match) return false;
          }
        }
      }

      return true;
    });

    // Step 2: Apply group-preserving global search (if grouping is enabled)
    const searchTerms = bookmark.filtersState.globalSearchTerms || [];
    const groupingColumn = bookmark.tableState?.grouping?.[0] as keyof FixtureData | undefined;

    if (searchTerms.length > 0 && groupingColumn) {
      // Group fixtures by their grouping column
      const fixturesByGroup = new Map<string, FixtureData[]>();
      data.forEach(fixture => {
        const groupKey = String(fixture[groupingColumn]);
        if (!fixturesByGroup.has(groupKey)) {
          fixturesByGroup.set(groupKey, []);
        }
        fixturesByGroup.get(groupKey)!.push(fixture);
      });

      // Find groups where ALL search terms exist somewhere in the group
      const matchingGroupKeys = new Set<string>();
      fixturesByGroup.forEach((fixtures, groupKey) => {
        // Combine searchable text from ALL fixtures in this group
        const groupSearchableText = fixtures
          .map(fixture => [
            fixture.fixtureId,
            fixture.orderId,
            fixture.cpId,
            fixture.vessels,
            fixture.owner,
            fixture.broker,
            fixture.charterer,
          ].filter(Boolean).join(' '))
          .join(' ')
          .toLowerCase();

        // Check if ALL search terms exist in the group's combined text (AND logic)
        const groupMatches = searchTerms.every(term =>
          groupSearchableText.includes(term.toLowerCase())
        );

        if (groupMatches) {
          matchingGroupKeys.add(groupKey);
        }
      });

      // Return count of matching groups
      return matchingGroupKeys.size;
    }

    // Step 3: Apply fixture-level search (if no grouping but search terms exist)
    if (searchTerms.length > 0) {
      data = data.filter((fixture) => {
        const searchableText = [
          fixture.fixtureId,
          fixture.orderId,
          fixture.cpId,
          fixture.vessels,
          fixture.personInCharge,
          fixture.owner,
          fixture.broker,
          fixture.charterer,
        ]
          .join(" ")
          .toLowerCase();
        return searchTerms.every((term) =>
          searchableText.includes(term.toLowerCase())
        );
      });
    }

    // Step 4: Return count (groups if grouping enabled, fixtures otherwise)
    if (groupingColumn) {
      const uniqueGroups = new Set(
        data.map(fixture => fixture[groupingColumn])
      );
      return uniqueGroups.size;
    }

    return data.length;
  };

  // Dynamically calculate counts for all bookmarks
  const systemBookmarksWithCounts = useMemo(() => {
    return systemBookmarks.map((bookmark) => ({
      ...bookmark,
      count: calculateBookmarkCount(bookmark),
    }));
  }, [fixtureData, systemBookmarks]);

  const bookmarksWithCounts = useMemo(() => {
    return bookmarks.map((bookmark) => ({
      ...bookmark,
      count: calculateBookmarkCount(bookmark),
    }));
  }, [bookmarks, fixtureData]);

  // Get active bookmark
  const activeBookmark = useMemo(() => {
    return [...systemBookmarksWithCounts, ...bookmarksWithCounts].find(
      (b) => b.id === activeBookmarkId,
    );
  }, [systemBookmarksWithCounts, bookmarksWithCounts, activeBookmarkId]);

  // Check if current state is dirty (differs from saved bookmark)
  const isDirty = useMemo(() => {
    if (!activeBookmark) return false;

    const savedFiltersState = activeBookmark.filtersState || {
      activeFilters: {},
      pinnedFilters: [],
      globalSearchTerms: [],
    };
    const savedTableState = activeBookmark.tableState || {
      sorting: [],
      columnVisibility: {},
      grouping: [],
      columnOrder: [],
      columnSizing: {},
    };

    // Compare filters state
    let filtersMatch =
      JSON.stringify(activeFilters) ===
        JSON.stringify(savedFiltersState.activeFilters) &&
      JSON.stringify(globalSearchTerms) ===
        JSON.stringify(savedFiltersState.globalSearchTerms);

    // For user bookmarks, also compare pinned filters
    if (activeBookmark.type === "user") {
      filtersMatch =
        filtersMatch &&
        JSON.stringify(pinnedFilters) ===
          JSON.stringify(savedFiltersState.pinnedFilters);
    }

    // Compare table state
    const tableMatch =
      JSON.stringify(sorting) === JSON.stringify(savedTableState.sorting) &&
      JSON.stringify(columnVisibility) ===
        JSON.stringify(savedTableState.columnVisibility) &&
      JSON.stringify(grouping) === JSON.stringify(savedTableState.grouping);

    return !filtersMatch || !tableMatch;
  }, [
    activeBookmark,
    activeFilters,
    globalSearchTerms,
    pinnedFilters,
    sorting,
    columnVisibility,
    grouping,
  ]);

  // Load bookmark state
  const loadBookmark = (bookmark: Bookmark) => {
    setActiveBookmarkId(bookmark.id);

    if (bookmark.filtersState) {
      setActiveFilters(bookmark.filtersState.activeFilters);
      setGlobalSearchTerms(bookmark.filtersState.globalSearchTerms);

      // Handle pinned filters based on bookmark type
      if (bookmark.type === "user") {
        // User bookmarks: restore saved pinned filters
        setPinnedFilters(bookmark.filtersState.pinnedFilters);
      } else {
        // System bookmarks: restore global pinned filters
        setPinnedFilters(globalPinnedFilters);
      }
    } else {
      setActiveFilters({});
      setGlobalSearchTerms([]);

      // If no filtersState, use global pinned filters (for system bookmarks)
      if (bookmark.type === "system") {
        setPinnedFilters(globalPinnedFilters);
      }
    }

    if (bookmark.tableState) {
      setSorting(bookmark.tableState.sorting);
      setColumnVisibility(bookmark.tableState.columnVisibility);
      setGrouping(bookmark.tableState.grouping);
      setColumnOrder(bookmark.tableState.columnOrder || []);
      setColumnSizing(bookmark.tableState.columnSizing);
    } else {
      setSorting([]);
      setColumnVisibility({});
      setGrouping([]);
      setColumnOrder([]);
      setColumnSizing({});
    }
  };

  // Load initial bookmark state on mount
  useEffect(() => {
    const initialBookmark = [...systemBookmarks, ...bookmarks].find(
      (b) => b.id === activeBookmarkId
    );
    if (initialBookmark) {
      loadBookmark(initialBookmark);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Sync global search terms to expand groups when searching
  useEffect(() => {
    if (globalSearchTerms.length > 0) {
      setExpanded(true); // Auto-expand all groups when searching
    }
  }, [globalSearchTerms]);

  // Helper function to check if a fixture matches global search terms
  const matchesGlobalSearch = (fixture: FixtureData): boolean => {
    if (globalSearchTerms.length === 0) return true;

    // Searchable fields
    const searchableText = [
      fixture.fixtureId,
      fixture.orderId,
      fixture.cpId,
      fixture.vessels,
      fixture.owner,
      fixture.broker,
      fixture.charterer,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Check if ALL search terms are present (AND logic)
    return globalSearchTerms.every(term =>
      searchableText.includes(term.toLowerCase())
    );
  };

  // Data filtering with group-preserving search logic
  const filteredData = useMemo(() => {
    // Step 1: Apply bookmark and field filters (non-search filters)
    let data = fixtureData.filter((fixture) => {
      // Special filter for Negotiations bookmark
      if (activeBookmarkId === "system-negotiations") {
        if (!fixture.negotiationId || fixture.negotiationId === "-") {
          return false;
        }
      }

      // Special filter for Contracts bookmark
      if (activeBookmarkId === "system-contracts") {
        if (!fixture.cpId) {
          return false;
        }
      }

      // Apply active filters (from Filters sidebar)
      for (const [filterId, filterValue] of Object.entries(activeFilters)) {
        if (Array.isArray(filterValue) && filterValue.length > 0) {
          const fixtureValue = String(
            fixture[filterId as keyof typeof fixture] || "",
          );
          const match = filterValue.some((val) =>
            fixtureValue.toLowerCase().includes(String(val).toLowerCase()),
          );
          if (!match) return false;
        }
      }

      return true;
    });

    // Step 2: Apply group-preserving global search
    if (globalSearchTerms.length > 0) {
      // Get the active grouping column (fixtureId, negotiationId, or cpId)
      const groupingColumn = grouping[0] as keyof FixtureData | undefined;

      if (groupingColumn) {
        // Group fixtures by their grouping column
        const fixturesByGroup = new Map<string, FixtureData[]>();
        data.forEach(fixture => {
          const groupKey = String(fixture[groupingColumn]);
          if (!fixturesByGroup.has(groupKey)) {
            fixturesByGroup.set(groupKey, []);
          }
          fixturesByGroup.get(groupKey)!.push(fixture);
        });

        // Find groups where ALL search terms exist somewhere in the group
        const matchingGroupKeys = new Set<string>();
        fixturesByGroup.forEach((fixtures, groupKey) => {
          // Combine searchable text from ALL fixtures in this group
          const groupSearchableText = fixtures
            .map(fixture => [
              fixture.fixtureId,
              fixture.orderId,
              fixture.cpId,
              fixture.vessels,
              fixture.owner,
              fixture.broker,
              fixture.charterer,
            ].filter(Boolean).join(' '))
            .join(' ')
            .toLowerCase();

          // Check if ALL search terms exist in the group's combined text (AND logic)
          const groupMatches = globalSearchTerms.every(term =>
            groupSearchableText.includes(term.toLowerCase())
          );

          if (groupMatches) {
            matchingGroupKeys.add(groupKey);
          }
        });

        // Include ALL fixtures that belong to matching groups
        data = data.filter(fixture =>
          matchingGroupKeys.has(String(fixture[groupingColumn]))
        );
      } else {
        // No grouping active, filter normally
        data = data.filter(matchesGlobalSearch);
      }
    }

    return data;
  }, [fixtureData, activeFilters, activeBookmarkId, globalSearchTerms, grouping]);

  // Bookmark handlers
  const handleBookmarkSelect = (bookmark: Bookmark) => {
    loadBookmark(bookmark);
  };

  const handleRevert = () => {
    if (activeBookmark) {
      // Revert filters, table state, and pinnedFilters (for user bookmarks)
      if (activeBookmark.filtersState) {
        setActiveFilters(activeBookmark.filtersState.activeFilters);
        setGlobalSearchTerms(activeBookmark.filtersState.globalSearchTerms);

        // Restore pinned filters for user bookmarks
        if (activeBookmark.type === "user") {
          setPinnedFilters(activeBookmark.filtersState.pinnedFilters);
        }
      } else {
        setActiveFilters({});
        setGlobalSearchTerms([]);
      }

      if (activeBookmark.tableState) {
        setSorting(activeBookmark.tableState.sorting);
        setColumnVisibility(activeBookmark.tableState.columnVisibility);
        setGrouping(activeBookmark.tableState.grouping);
        setColumnOrder(activeBookmark.tableState.columnOrder || []);
        setColumnSizing(activeBookmark.tableState.columnSizing);
      } else {
        setSorting([]);
        setColumnVisibility({});
        setGrouping([]);
        setColumnOrder([]);
        setColumnSizing({});
      }
    }
  };

  const handleSave = async (action: "update" | "create", name?: string) => {
    const newState: Bookmark = {
      id: action === "create" ? `user-${Date.now()}` : activeBookmarkId!,
      name: name || activeBookmark?.name || "New Bookmark",
      type: "user",
      createdAt: action === "create" ? new Date() : activeBookmark!.createdAt,
      updatedAt: new Date(),
      count: filteredData.length,
      filtersState: {
        activeFilters,
        pinnedFilters,
        globalSearchTerms,
      },
      tableState: {
        sorting,
        columnVisibility,
        grouping,
        columnOrder,
        columnSizing,
      },
    };

    if (action === "create") {
      setBookmarks([...bookmarks, newState]);
      setActiveBookmarkId(newState.id);
    } else {
      setBookmarks(bookmarks.map((b) => (b.id === newState.id ? newState : b)));
    }
  };

  const handleRename = async (id: string, newName: string) => {
    setBookmarks(
      bookmarks.map((b) => (b.id === id ? { ...b, name: newName } : b)),
    );
  };

  const handleDelete = async (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
    if (activeBookmarkId === id) {
      const firstAvailable =
        systemBookmarksWithCounts[0] ||
        bookmarksWithCounts.find((b) => b.id !== id);
      if (firstAvailable) {
        loadBookmark(firstAvailable);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    setBookmarks(
      bookmarks.map((b) => ({
        ...b,
        isDefault: b.id === id,
      })),
    );
  };

  // Handle pinned filters change
  const handlePinnedFiltersChange = (newPinnedFilters: string[]) => {
    setPinnedFilters(newPinnedFilters);

    // If on a system bookmark, update the global pinned filters
    if (activeBookmark?.type === "system") {
      setGlobalPinnedFilters(newPinnedFilters);
    }
  };

  // Filter handlers
  const handleFilterChange = (filterId: string, value: FilterValue) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const handleFilterClear = (filterId: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  };

  const handleFilterReset = () => {
    setActiveFilters({});
    setGlobalSearchTerms([]);
  };

  // Handle row clicks to open sidebar
  const handleRowClick = (row: any) => {
    // For single-item groups, get the data from the first (and only) subrow
    const fixtureData = row.getIsGrouped() && row.subRows?.length === 1
      ? row.subRows[0].original
      : row.original;

    setSelectedFixture(fixtureData);
  };

  return (
    <>
      <div className="m-6 flex flex-col gap-[var(--space-lg)]">
        {/* Page Header */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <h1 className="text-heading-lg">Fixtures</h1>
        </div>

        {/* Bookmarks Tabs Row + Filters Row */}
        <Bookmarks
          variant="tabs"
          bookmarks={bookmarksWithCounts}
          systemBookmarks={systemBookmarksWithCounts}
          activeBookmarkId={activeBookmarkId}
          isDirty={isDirty}
          onSelect={handleBookmarkSelect}
          onRevert={handleRevert}
          onSave={handleSave}
          onRename={handleRename}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
        >
          <Bookmarks.Content>
            <Filters
              filters={filterDefinitions}
              activeFilters={activeFilters}
              pinnedFilters={pinnedFilters}
              onPinnedFiltersChange={handlePinnedFiltersChange}
              onFilterChange={handleFilterChange}
              onFilterClear={handleFilterClear}
              onFilterReset={handleFilterReset}
              enableGlobalSearch={true}
              globalSearchTerms={globalSearchTerms}
              onGlobalSearchChange={setGlobalSearchTerms}
              globalSearchPlaceholder="Search fixtures…"
              hideReset={true}
            />
          </Bookmarks.Content>

          <Bookmarks.Actions>
            {isDirty && (
              <>
                <Separator type="dot" layout="horizontal" />

                {activeBookmark?.type === "system" ? (
                  // System bookmark actions
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleRevert}
                      className="h-[var(--size-md)] flex-shrink-0"
                    >
                      Reset
                    </Button>
                    <Bookmarks.CreateButton />
                  </>
                ) : (
                  // User bookmark actions
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleRevert}
                      className="h-[var(--size-md)] flex-shrink-0"
                    >
                      Revert Changes
                    </Button>
                    <Bookmarks.SaveDropdown />
                  </>
                )}
              </>
            )}
          </Bookmarks.Actions>

          <Bookmarks.Settings>
            <DataTableSettingsMenu
              sortableColumns={fixtureColumns
                .filter(
                  (col): col is typeof col & { accessorKey: string } =>
                    "accessorKey" in col && typeof col.accessorKey === "string",
                )
                .map((col) => ({
                  id: col.accessorKey,
                  label: ((col.meta as any)?.label || col.header) as string,
                }))}
              selectedSortColumn={sorting[0]?.id}
              sortDirection={sorting[0]?.desc ? "desc" : "asc"}
              onSortChange={(columnId) =>
                setSorting([{ id: columnId, desc: sorting[0]?.desc || false }])
              }
              onSortDirectionChange={(direction) => {
                if (sorting[0]) {
                  setSorting([
                    { id: sorting[0].id, desc: direction === "desc" },
                  ]);
                }
              }}
              groupableColumns={fixtureColumns
                .filter(
                  (
                    col,
                  ): col is typeof col & {
                    accessorKey: string;
                    enableGrouping: boolean;
                  } =>
                    "accessorKey" in col &&
                    typeof col.accessorKey === "string" &&
                    "enableGrouping" in col &&
                    col.enableGrouping === true,
                )
                .map((col) => ({
                  id: col.accessorKey,
                  label: ((col.meta as any)?.label || col.header) as string,
                }))}
              selectedGroupColumn={grouping[0] || ""}
              onGroupChange={(columnId) => {
                if (!columnId || columnId === "none") {
                  setGrouping([]);
                } else {
                  setGrouping([columnId]);
                }
              }}
              columns={fixtureColumns
                .filter(
                  (col): col is typeof col & { accessorKey: string } =>
                    "accessorKey" in col && typeof col.accessorKey === "string",
                )
                .map((col) => ({
                  id: col.accessorKey,
                  label: ((col.meta as any)?.label || col.header) as string,
                }))}
              visibleColumns={Object.entries(columnVisibility)
                .filter(([_, visible]) => visible !== false)
                .map(([id]) => id)
                .concat(
                  fixtureColumns
                    .filter(
                      (col): col is typeof col & { accessorKey: string } =>
                        "accessorKey" in col &&
                        typeof col.accessorKey === "string" &&
                        columnVisibility[col.accessorKey] === undefined,
                    )
                    .map((col) => col.accessorKey),
                )}
              onColumnVisibilityChange={(columnId, visible) => {
                setColumnVisibility((prev) => {
                  const newVisibility = { ...prev };
                  if (visible) {
                    delete newVisibility[columnId];
                  } else {
                    newVisibility[columnId] = false;
                  }
                  return newVisibility;
                });
              }}
              align="end"
              triggerClassName="h-[var(--size-md)]"
            />
          </Bookmarks.Settings>
        </Bookmarks>

        {/* Data Table */}
        <div className="fixtures-table">
          <DataTable
            data={filteredData}
            columns={fixtureColumns}
            enableGrouping={true}
            enableExpanding={true}
            enableResponsiveWrapper={true}
            borderStyle="horizontal"
            showHeader={false}
            groupedColumnMode="reorder"
            stickyHeader
            // Group-preserving search handled via manual filtering and auto-expansion
            enableGlobalSearch={false}
            // Controlled state
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            grouping={grouping}
            onGroupingChange={setGrouping}
            initialState={{
              expanded,
            }}
            autoExpandChildren={globalSearchTerms.length > 0}
            groupDisplayColumn={
              grouping[0] === "fixtureId" && columnVisibility.fixtureId === false
                ? "orderId"
                : undefined
            }
            hideChildrenForSingleItemGroups={{ fixtureId: true, negotiationId: true, cpId: true }}
            hideExpanderForSingleItemGroups={{ negotiationId: true, cpId: true }}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            columnSizing={columnSizing}
            onColumnSizingChange={setColumnSizing}
            onRowClick={handleRowClick}
            isRowClickable={(row) => !row.getIsGrouped() || row.subRows?.length === 1}
            footerLabel={
              (() => {
                // When grouping is active, count groups; otherwise count fixtures
                const displayCount = grouping.length > 0
                  ? new Set(filteredData.map(fixture => fixture[grouping[0] as keyof FixtureData])).size
                  : filteredData.length;

                return (
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    Showing <strong className="text-[var(--color-text-primary)]">{displayCount}</strong> of{" "}
                    <strong className="text-[var(--color-text-primary)]">{fixtureData.length}</strong> items
                  </span>
                );
              })()
            }
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
