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
  AttributesContent,
  AttributesChevron,
  ActivityLog,
  ActivityLogItem,
  ActivityLogTime,
  ActivityLogHeader,
  ActivityLogDescription,
  ActivityLogValue,
  ActivityLogContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Flag,
  type FilterDefinition,
  type FilterValue,
  type Bookmark,
} from "@rafal.lemieszewski/tide-ui";
import { useHeaderActions } from "../hooks";
import { ExportDialog } from "../components/ExportDialog";
import { FormattedActivityLogDescription, ActivityLogExpandableContent } from "../components/ActivityLogDescription";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatLaycanRange, formatCargo } from "../utils/dataUtils";

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
  ownerAvatarUrl?: string | null;
  broker: string;
  brokerAvatarUrl?: string | null;
  charterer: string;
  chartererAvatarUrl?: string | null;
  lastUpdated: number;
  // Full objects for sidebar display
  contract?: any;
  order?: any;
  negotiation?: any;
  vessel?: any;
  loadPort?: any;
  dischargePort?: any;
  cargoType?: any;
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
  oldValue?: string;  // The previous value (for 'updated' action)
}




// Transform database contracts and recap managers to FixtureData format
const transformFixturesToTableData = (
  fixtures: any[]
): FixtureData[] => {
  const tableData: FixtureData[] = [];

  fixtures.forEach((fixture) => {
    // Combine contracts and recap managers
    const allContracts = [
      ...fixture.contracts.map((c: any) => ({ ...c, source: "contract" })),
      ...fixture.recapManagers.map((r: any) => ({ ...r, source: "recap" })),
    ];

    if (allContracts.length === 0) return; // Skip empty fixtures

    // Create a row for each contract/recap manager
    // TanStack Table will handle grouping by fixtureId automatically
    allContracts.forEach((item: any) => {
      const isContract = item.source === "contract";
      const contractNumber = isContract ? item.contractNumber : item.recapNumber;

      tableData.push({
        id: item._id,
        fixtureId: fixture.fixtureNumber,
        orderId: item.order?.orderNumber || fixture.order?.orderNumber || "-",
        cpId: contractNumber,
        stage: item.contractType === "coa" ? "COA" : "Charter Party",
        typeOfContract:
          item.contractType === "voyage-charter"
            ? "Voyage charter"
            : item.contractType === "time-charter"
            ? "TC"
            : "COA",
        negotiationId: item.negotiation?.negotiationNumber || "-",
        vessels: item.vessel?.name || "TBN",
        personInCharge: item.personInCharge?.name || item.negotiation?.personInCharge?.name || "User",
        status: isContract ? `contract-${item.status}` : `recap-manager-${item.status}`,
        approvalStatus: item.approvalStatus || "Not started",
        owner: item.owner?.name || "Unknown",
        ownerAvatarUrl: item.owner?.avatarUrl,
        broker: item.broker?.name || "Unknown",
        brokerAvatarUrl: item.broker?.avatarUrl,
        charterer: item.charterer?.name || "Unknown",
        chartererAvatarUrl: item.charterer?.avatarUrl,
        lastUpdated: item.updatedAt || item._creationTime,
        // Include full objects for sidebar
        contract: item,
        order: item.order || fixture.order,
        negotiation: item.negotiation,
        vessel: item.vessel,
        loadPort: item.loadPort,
        dischargePort: item.dischargePort,
        cargoType: item.cargoType,
      });
    });
  });

  return tableData.sort((a, b) => b.lastUpdated - a.lastUpdated);
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

// Helper function to get company initials for avatar fallback
const getCompanyInitials = (companyName: string): string => {
  const words = companyName.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

// Helper function to transform field changes for display
const transformFieldChanges = (
  fieldChanges: any[] | undefined,
  fieldName: string
): ChangeHistoryEntry[] => {
  if (!fieldChanges) return [];

  return fieldChanges
    .filter((change) => change.fieldName === fieldName)
    .map((change) => {
      const date = new Date(change.timestamp);
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      }).replace(',', ' at');

      return {
        timestamp: formattedDate,
        user: {
          name: change.user?.name || 'Unknown',
          avatar: change.user?.avatarUrl || undefined,
        },
        action: change.oldValue ? 'updated' : 'created',
        status: {
          value: 'contract-working-copy',
          label: 'contract working copy',
        },
        value: change.newValue || '',
        oldValue: change.oldValue || '',
      };
    });
};

// Fixture Sidebar Component
function FixtureSidebar({
  fixture,
  onClose,
}: {
  fixture: FixtureData;
  onClose: () => void;
}) {
  // Fetch field changes for this contract
  const fieldChanges = useQuery(
    api.audit.getFieldChanges,
    fixture.contract?._id
      ? { entityType: "contract", entityId: fixture.contract._id }
      : "skip"
  );

  // Fetch activity logs for contract and negotiation
  const contractActivityLog = useQuery(
    api.audit.getActivityLog,
    fixture.contract?._id
      ? { entityType: "contract", entityId: fixture.contract._id }
      : "skip"
  );

  const negotiationActivityLog = useQuery(
    api.audit.getActivityLog,
    fixture.negotiation?._id
      ? { entityType: "negotiation", entityId: fixture.negotiation._id }
      : "skip"
  );

  const approvalStatus: any | undefined = undefined; // TODO: implement getApprovalStatus query

  // Combine and sort activity logs (oldest first)
  const allActivityLogs: any[] = useMemo(() => {
    const logs = [
      ...(contractActivityLog || []),
      ...(negotiationActivityLog || []),
    ];
    return logs.sort((a: any, b: any) => a.timestamp - b.timestamp); // Oldest first
  }, [contractActivityLog, negotiationActivityLog]);

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 bg-[var(--color-surface-base)] p-0" style={{ width: '640px', maxWidth: '640px' }}>
        <SheetTitle className="sr-only">Fixture {fixture.id}</SheetTitle>

        <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden gap-0">
          {/* Header */}
          <div className="flex-shrink-0 bg-[var(--color-surface-primary)]">
            <div className="flex items-start justify-between px-6 pb-6 pt-6">
              <div className="flex flex-col gap-1">
                {/* Main title line with fixture ID */}
                <div className="flex items-center gap-2 text-[20px] font-semibold leading-6 tracking-[-0.2px] text-[var(--color-text-primary)]">
                  <span>
                    {fixture.orderId && fixture.negotiationId && fixture.orderId !== "-" && fixture.negotiationId !== "-"
                      ? `${fixture.orderId} • ${fixture.negotiationId}`
                      : fixture.cpId || fixture.fixtureId}
                  </span>
                </div>

                {/* Metadata line with companies, route, and cargo */}
                <div className="flex flex-wrap items-center gap-1.5 text-body-xsm text-[var(--color-text-secondary)]">
                  <span>{fixture.charterer}</span>
                  <span>×</span>
                  <span>{fixture.owner}</span>
                  {fixture.loadPort && fixture.dischargePort && (
                    <>
                      <span>•</span>
                      <span>
                        {fixture.loadPort.name}
                        {fixture.loadPort.countryCode && `, ${fixture.loadPort.countryCode}`}
                      </span>
                      <Icon name="arrow-right" size="sm" />
                      <span>
                        {fixture.dischargePort.name}
                        {fixture.dischargePort.countryCode && `, ${fixture.dischargePort.countryCode}`}
                      </span>
                    </>
                  )}
                  {fixture.cargoType && fixture.contract?.quantity && (
                    <>
                      <span>•</span>
                      <span>
                        {formatCargo(
                          fixture.contract.quantity,
                          fixture.contract.quantityUnit || "MT",
                          fixture.cargoType.name
                        )}
                      </span>
                    </>
                  )}
                  {fixture.contract?.laycanStart && fixture.contract?.laycanEnd && (
                    <>
                      <span>•</span>
                      <span>{formatLaycanRange(fixture.contract.laycanStart, fixture.contract.laycanEnd)}</span>
                    </>
                  )}
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
                            <FixtureStatus value="negotiation-fixed" size="sm" lowercase={false} />
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
                            <FixtureStatus value="contract-working-copy" size="sm" lowercase={false} />
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>

                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Approval</AttributesLabel>
                          <AttributesValue>
                            {approvalStatus
                              ? `${approvalStatus.summary.approved}/${approvalStatus.summary.total + approvalStatus.summary.pending} approved`
                              : "Not started"}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    </AttributesGroup>
                </AttributesList>
              </Card>

              {/* Fixture Specification Card */}
              <Card className="p-6">
                <h3 className="mb-4 text-body-lg font-semibold text-[var(--color-text-primary)]">Fixture specification</h3>

                {/* Pre-compute field changes for conditional rendering */}
                {(() => {
                  const chartererChanges = transformFieldChanges(fieldChanges, "chartererId");
                  const brokerChanges = transformFieldChanges(fieldChanges, "brokerId");
                  const ownerChanges = transformFieldChanges(fieldChanges, "ownerId");
                  const loadPortChanges = transformFieldChanges(fieldChanges, "loadPortId");
                  const dischargePortChanges = transformFieldChanges(fieldChanges, "dischargePortId");
                  const cargoChanges = transformFieldChanges(fieldChanges, "quantity");
                  const laycanChanges = transformFieldChanges(fieldChanges, "laycanStart");
                  const freightRateChanges = transformFieldChanges(fieldChanges, "freightRate");
                  const demurrageChanges = transformFieldChanges(fieldChanges, "demurrageRate");

                  const hasChartererChanges = chartererChanges.length > 0;
                  const hasBrokerChanges = brokerChanges.length > 0;
                  const hasOwnerChanges = ownerChanges.length > 0;
                  const hasLoadPortChanges = loadPortChanges.length > 0;
                  const hasDischargePortChanges = dischargePortChanges.length > 0;
                  const hasCargoChanges = cargoChanges.length > 0;
                  const hasLaycanChanges = laycanChanges.length > 0;
                  const hasFreightRateChanges = freightRateChanges.length > 0;
                  const hasDemurrageChanges = demurrageChanges.length > 0;

                  return (
                <AttributesList style={{ gridTemplateColumns: 'minmax(140px, auto) 1fr' }}>
                  <AttributesGroup label="Involved Parties">
                    <AttributesItem collapsible={hasChartererChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasChartererChanges}>
                        <AttributesLabel>Charterer</AttributesLabel>
                        <AttributesValue>
                          <Avatar type="organization" size="xs">
                            <AvatarImage src={fixture.chartererAvatarUrl || undefined} alt={fixture.charterer} />
                            <AvatarFallback>{getCompanyInitials(fixture.charterer)}</AvatarFallback>
                          </Avatar>
                          {fixture.charterer}
                          {hasChartererChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasChartererChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {chartererChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Charterer to' : 'changed Charterer from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasBrokerChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasBrokerChanges}>
                        <AttributesLabel>Broker</AttributesLabel>
                        <AttributesValue>
                          <Avatar type="organization" size="xs">
                            <AvatarImage src={fixture.brokerAvatarUrl || undefined} alt={fixture.broker} />
                            <AvatarFallback>{getCompanyInitials(fixture.broker)}</AvatarFallback>
                          </Avatar>
                          {fixture.broker}
                          {hasBrokerChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasBrokerChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {brokerChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Broker to' : 'changed Broker from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasOwnerChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasOwnerChanges}>
                        <AttributesLabel>Owner</AttributesLabel>
                        <AttributesValue>
                          <Avatar type="organization" size="xs">
                            <AvatarImage src={fixture.ownerAvatarUrl || undefined} alt={fixture.owner} />
                            <AvatarFallback>{getCompanyInitials(fixture.owner)}</AvatarFallback>
                          </Avatar>
                          {fixture.owner}
                          {hasOwnerChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasOwnerChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {ownerChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Owner to' : 'changed Owner from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Vessel" showHiddenLabel="More details" hideLabel="Less details">
                    <AttributesItem>
                      <AttributesRow>
                        <AttributesLabel>Vessel name</AttributesLabel>
                        <AttributesValue>{fixture.vessel?.name || "TBN"}</AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    {fixture.vessel?.imoNumber && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>IMO Number</AttributesLabel>
                          <AttributesValue>{fixture.vessel.imoNumber}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.callsign && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Callsign</AttributesLabel>
                          <AttributesValue>{fixture.vessel.callsign}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.builtDate && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Built date</AttributesLabel>
                          <AttributesValue>
                            {new Date(fixture.vessel.builtDate).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.grt && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>GRT</AttributesLabel>
                          <AttributesValue>{fixture.vessel.grt.toLocaleString()} mt</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.flag && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Flag</AttributesLabel>
                          <AttributesValue>{fixture.vessel.flag}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.vesselClass && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Class</AttributesLabel>
                          <AttributesValue>{fixture.vessel.vesselClass}</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.dwt && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>DWT</AttributesLabel>
                          <AttributesValue>{fixture.vessel.dwt.toLocaleString()} mt</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.draft && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Draft</AttributesLabel>
                          <AttributesValue>{fixture.vessel.draft} m</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(fixture.vessel?.loa || fixture.vessel?.beam) && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>LOA/Beam</AttributesLabel>
                          <AttributesValue>
                            {fixture.vessel.loa ? `${fixture.vessel.loa} m` : '—'} • {fixture.vessel.beam ? `${fixture.vessel.beam} m` : '—'}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.vessel?.maxHeight && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Max height</AttributesLabel>
                          <AttributesValue>{fixture.vessel.maxHeight} m</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(fixture.vessel?.speedKnots || fixture.vessel?.consumptionPerDay) && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Speed & Consumption</AttributesLabel>
                          <AttributesValue>
                            {fixture.vessel.speedKnots ? `${fixture.vessel.speedKnots} knots` : '—'} • {fixture.vessel.consumptionPerDay ? `${fixture.vessel.consumptionPerDay.toLocaleString()} l/day` : '—'}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.contract?.fullCpChainStorageId && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Full CP chain</AttributesLabel>
                          <AttributesValue>Available</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.contract?.itineraryStorageId && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Full itinerary</AttributesLabel>
                          <AttributesValue>Available</AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}
                  </AttributesGroup>

                  <AttributesSeparator />

                  <AttributesGroup label="Voyage">
                    <AttributesItem collapsible={hasLoadPortChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasLoadPortChanges}>
                        <AttributesLabel>Load Port</AttributesLabel>
                        <AttributesValue>
                          {fixture.loadPort?.countryCode && (
                            <Flag country={fixture.loadPort.countryCode.toLowerCase()} />
                          )}
                          {fixture.loadPort?.name}, {fixture.loadPort?.countryCode}
                          {hasLoadPortChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasLoadPortChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {loadPortChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Load Port to' : 'changed Load Port from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasDischargePortChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasDischargePortChanges}>
                        <AttributesLabel>Discharge Port</AttributesLabel>
                        <AttributesValue>
                          {fixture.dischargePort?.countryCode && (
                            <Flag country={fixture.dischargePort.countryCode.toLowerCase()} />
                          )}
                          {fixture.dischargePort?.name}, {fixture.dischargePort?.countryCode}
                          {hasDischargePortChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasDischargePortChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {dischargePortChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Discharge Port to' : 'changed Discharge Port from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasCargoChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasCargoChanges}>
                        <AttributesLabel>Cargo</AttributesLabel>
                        <AttributesValue>
                          Iron Ore • 160,000 mt
                          {hasCargoChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasCargoChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {cargoChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Cargo to' : 'changed Cargo from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasLaycanChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasLaycanChanges}>
                        <AttributesLabel>Laycan</AttributesLabel>
                        <AttributesValue>
                          27th October, 2025 (0001 hrs) – 30th October, 2025 (2359 hrs)
                          {hasLaycanChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasLaycanChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {laycanChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Laycan to' : 'changed Laycan from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
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

                    <AttributesItem collapsible={hasFreightRateChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasFreightRateChanges}>
                        <AttributesLabel>Freight Rate</AttributesLabel>
                        <AttributesValue>
                          25.12 $/mt
                          {hasFreightRateChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasFreightRateChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {freightRateChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Freight Rate to' : 'changed Freight Rate from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasDemurrageChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasDemurrageChanges}>
                        <AttributesLabel>Demurrage / Despatch</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.demurrageRate || "Not specified"}
                          {hasDemurrageChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasDemurrageChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {demurrageChanges.map((entry, index) => (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{entry.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{entry.user.name}</span>
                                      <span>{entry.action === 'created' ? 'set Demurrage Rate to' : 'changed Demurrage Rate from'}</span>
                                      {entry.action === 'updated' && entry.oldValue && (
                                        <>
                                          <ActivityLogValue>{entry.oldValue}</ActivityLogValue>
                                          <span>to</span>
                                        </>
                                      )}
                                      <ActivityLogValue>{entry.value}</ActivityLogValue>
                                      <ActivityLogTime>{entry.timestamp}</ActivityLogTime>
                                    </ActivityLogDescription>
                                  </ActivityLogHeader>
                                </ActivityLogItem>
                              ))}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
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
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      {fixture.order?.description || "No notes"}
                    </p>
                  </AttributesGroup>
                </AttributesList>
                  );
                })()}
              </Card>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent
            value="activity"
            className="mt-0 flex-1 overflow-y-auto bg-[var(--color-surface-base)]"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {(() => {
              return (
                <>
                  {/* Negotiation Card - Only show if fixture has negotiation */}
                  {fixture.negotiation && (() => {
                    const negotiationLogs = allActivityLogs.filter((log) => log.entityType === 'negotiation');

                    if (negotiationLogs.length === 0) {
                      return (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-body-md text-[var(--color-text-tertiary)]">
                            No history of activity yet
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Card className="p-6">
                        <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                          Negotiation
                        </h3>
                        <ActivityLog separatorThreshold={86400000}>
                          {negotiationLogs.map((entry, index) => {
                            const userName = entry.user?.name || 'System';
                            const userInitials = userName === "System"
                              ? "S"
                              : userName.split(' ').map((n: string) => n[0]).join('');

                            const date = new Date(entry.timestamp);
                            const formattedTimestamp = date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) + ' at ' + date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: false
                            });

                            const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

                            return (
                              <ActivityLogItem
                                key={index}
                                timestamp={entry.timestamp}
                                collapsible={hasExpandable}
                                defaultOpen={false}
                              >
                                <ActivityLogHeader asCollapsibleTrigger={hasExpandable}>
                                  <Avatar size="xxs">
                                    {entry.user?.avatarUrl ? (
                                      <AvatarImage src={entry.user.avatarUrl} alt={userName} />
                                    ) : null}
                                    <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                  </Avatar>
                                  <FormattedActivityLogDescription
                                    entry={entry}
                                    userName={userName}
                                    formattedTimestamp={formattedTimestamp}
                                  />
                                </ActivityLogHeader>
                                {hasExpandable && (
                                  <ActivityLogContent>
                                    <ActivityLogExpandableContent entry={entry} />
                                  </ActivityLogContent>
                                )}
                              </ActivityLogItem>
                            );
                          })}
                        </ActivityLog>
                      </Card>
                    );
                  })()}

                  {/* Contract Card */}
                  {(() => {
                    const contractLogs = allActivityLogs.filter((log) => log.entityType === 'contract');

                    if (contractLogs.length === 0) {
                      return (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-body-md text-[var(--color-text-tertiary)]">
                            No history of activity yet
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Card className="p-6">
                        <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                          Contract
                        </h3>
                        <ActivityLog separatorThreshold={86400000}>
                          {contractLogs.map((entry, index) => {
                            const userName = entry.user?.name || 'System';
                            const userInitials = userName === "System"
                              ? "S"
                              : userName.split(' ').map((n: string) => n[0]).join('');

                            const date = new Date(entry.timestamp);
                            const formattedTimestamp = date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) + ' at ' + date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: false
                            });

                            const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

                            return (
                              <ActivityLogItem
                                key={index}
                                timestamp={entry.timestamp}
                                collapsible={hasExpandable}
                                defaultOpen={false}
                              >
                                <ActivityLogHeader asCollapsibleTrigger={hasExpandable}>
                                  <Avatar size="xxs">
                                    {entry.user?.avatarUrl ? (
                                      <AvatarImage src={entry.user.avatarUrl} alt={userName} />
                                    ) : null}
                                    <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                  </Avatar>
                                  <FormattedActivityLogDescription
                                    entry={entry}
                                    userName={userName}
                                    formattedTimestamp={formattedTimestamp}
                                  />
                                </ActivityLogHeader>
                                {hasExpandable && (
                                  <ActivityLogContent>
                                    <ActivityLogExpandableContent entry={entry} />
                                  </ActivityLogContent>
                                )}
                              </ActivityLogItem>
                            );
                          })}
                        </ActivityLog>
                      </Card>
                    );
                  })()}
                </>
              );
              })()}
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
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Memoize header actions
  const headerActions = useMemo(
    () => (
      <Button
        variant="secondary"
        icon="share"
        iconPosition="left"
        onClick={() => setShowExportDialog(true)}
      >
        Export
      </Button>
    ),
    []
  );

  // Set header actions
  useHeaderActions(headerActions);

  // Get user's organization
  const organization = useQuery(api.organizations.getFirstOrganization);
  const organizationId = organization?._id;

  // Query fixtures with enriched data (includes contracts, recaps, and company avatars)
  const fixtures = useQuery(
    api.fixtures.listEnriched,
    organizationId ? { organizationId } : "skip"
  );

  // Detect loading state
  const isLoadingFixtures = fixtures === undefined;

  // Transform database data to fixture format
  const fixtureData = useMemo(() => {
    if (!fixtures) return [];
    return transformFixturesToTableData(fixtures);
  }, [fixtures]);

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
          const cpId = row.getValue("cpId") as string | undefined;

          // Parent rows without cpId show em dash
          if (!cpId) {
            return (
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                –
              </div>
            );
          }

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
          const allStatuses = (row.subRows?.map((r: any) => r.original.status) || []) as string[];

          // Single item group - show full status label without object prefix
          if (row.subRows?.length === 1) {
            return (
              <div className="flex items-center justify-start overflow-visible">
                <FixtureStatus value={allStatuses[0] as any} showObject={false} className="overflow-visible" />
              </div>
            );
          }

          // Multiple items - show all status icons including duplicates
          return (
            <div className="flex items-center justify-start gap-1 overflow-visible">
              {allStatuses.map((status, index) => (
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
          const ownerAvatarUrl = row.original.ownerAvatarUrl;
          return (
            <div className="flex items-center gap-2">
              <Avatar type="organization" size="xxs">
                <AvatarImage src={ownerAvatarUrl || undefined} alt={owner} />
                <AvatarFallback>{getCompanyInitials(owner)}</AvatarFallback>
              </Avatar>
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(owner, globalSearchTerms)}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          // Collect unique owners with avatar data
          const uniqueOwners = Array.from(
            new Map(
              row.subRows?.map((r: any) => [
                r.original.owner,
                { name: r.original.owner as string, avatarUrl: r.original.ownerAvatarUrl as string | undefined }
              ])
            ).values()
          ) as Array<{ name: string; avatarUrl?: string }>;

          // Single owner: avatar + name
          if (uniqueOwners.length === 1) {
            const owner = uniqueOwners[0];
            return (
              <div className="flex items-center gap-2">
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={owner.avatarUrl || undefined} alt={owner.name} />
                  <AvatarFallback>{getCompanyInitials(owner.name)}</AvatarFallback>
                </Avatar>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {highlightSearchTerms(owner.name, globalSearchTerms)}
                </div>
              </div>
            );
          }

          // Multiple owners: list avatars in a row
          const displayOwners = uniqueOwners.slice(0, 5);
          return (
            <div className="flex items-center gap-1">
              {displayOwners.map((owner, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar type="organization" size="xxs">
                        <AvatarImage src={owner.avatarUrl || undefined} alt={owner.name} />
                        <AvatarFallback>{getCompanyInitials(owner.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{owner.name}</TooltipContent>
                </Tooltip>
              ))}
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
          const brokerAvatarUrl = row.original.brokerAvatarUrl;
          return (
            <div className="flex items-center gap-2">
              <Avatar type="organization" size="xxs">
                <AvatarImage src={brokerAvatarUrl || undefined} alt={broker} />
                <AvatarFallback>{getCompanyInitials(broker)}</AvatarFallback>
              </Avatar>
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(broker, globalSearchTerms)}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          // Collect unique brokers with avatar data
          const uniqueBrokers = Array.from(
            new Map(
              row.subRows?.map((r: any) => [
                r.original.broker,
                { name: r.original.broker as string, avatarUrl: r.original.brokerAvatarUrl as string | undefined }
              ])
            ).values()
          ) as Array<{ name: string; avatarUrl?: string }>;

          // Single broker: avatar + name
          if (uniqueBrokers.length === 1) {
            const broker = uniqueBrokers[0];
            return (
              <div className="flex items-center gap-2">
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={broker.avatarUrl || undefined} alt={broker.name} />
                  <AvatarFallback>{getCompanyInitials(broker.name)}</AvatarFallback>
                </Avatar>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {highlightSearchTerms(broker.name, globalSearchTerms)}
                </div>
              </div>
            );
          }

          // Multiple brokers: list avatars in a row
          const displayBrokers = uniqueBrokers.slice(0, 5);
          return (
            <div className="flex items-center gap-1">
              {displayBrokers.map((broker, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar type="organization" size="xxs">
                        <AvatarImage src={broker.avatarUrl || undefined} alt={broker.name} />
                        <AvatarFallback>{getCompanyInitials(broker.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{broker.name}</TooltipContent>
                </Tooltip>
              ))}
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
          const chartererAvatarUrl = row.original.chartererAvatarUrl;
          return (
            <div className="flex items-center gap-2">
              <Avatar type="organization" size="xxs">
                <AvatarImage src={chartererAvatarUrl || undefined} alt={charterer} />
                <AvatarFallback>{getCompanyInitials(charterer)}</AvatarFallback>
              </Avatar>
              <div className="text-body-sm text-[var(--color-text-primary)]">
                {highlightSearchTerms(charterer, globalSearchTerms)}
              </div>
            </div>
          );
        },
        aggregatedCell: ({ row }: any) => {
          // Collect unique charterers with avatar data
          const uniqueCharterers = Array.from(
            new Map(
              row.subRows?.map((r: any) => [
                r.original.charterer,
                { name: r.original.charterer as string, avatarUrl: r.original.chartererAvatarUrl as string | undefined }
              ])
            ).values()
          ) as Array<{ name: string; avatarUrl?: string }>;

          // Single charterer: avatar + name
          if (uniqueCharterers.length === 1) {
            const charterer = uniqueCharterers[0];
            return (
              <div className="flex items-center gap-2">
                <Avatar type="organization" size="xxs">
                  <AvatarImage src={charterer.avatarUrl || undefined} alt={charterer.name} />
                  <AvatarFallback>{getCompanyInitials(charterer.name)}</AvatarFallback>
                </Avatar>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {highlightSearchTerms(charterer.name, globalSearchTerms)}
                </div>
              </div>
            );
          }

          // Multiple charterers: list avatars in a row
          const displayCharterers = uniqueCharterers.slice(0, 5);
          return (
            <div className="flex items-center gap-1">
              {displayCharterers.map((charterer, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar type="organization" size="xxs">
                        <AvatarImage src={charterer.avatarUrl || undefined} alt={charterer.name} />
                        <AvatarFallback>{getCompanyInitials(charterer.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{charterer.name}</TooltipContent>
                </Tooltip>
              ))}
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

  // Prepare available columns for export
  const availableColumnsForExport = useMemo(() => {
    return fixtureColumns
      .filter((col): col is typeof col & { accessorKey: string } =>
        "accessorKey" in col && typeof col.accessorKey === "string"
      )
      .map((col) => ({
        id: col.accessorKey,
        label: ((col.meta as any)?.label || col.header) as string,
      }));
  }, [fixtureColumns]);

  // Get visible columns for export
  const visibleColumnsForExport = useMemo(() => {
    return fixtureColumns
      .filter((col): col is typeof col & { accessorKey: string } => {
        if (!("accessorKey" in col) || typeof col.accessorKey !== "string") return false;
        const key = col.accessorKey;
        return columnVisibility[key] !== false;
      })
      .map((col) => col.accessorKey);
  }, [fixtureColumns, columnVisibility]);


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

  // Calculate bookmark data (data filtered by bookmark's saved filters only)
  const bookmarkData = useMemo(() => {
    if (!activeBookmark?.filtersState) {
      // If no saved filters, return data filtered by bookmark type only
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
        return true;
      });
      return data;
    }

    // Apply bookmark's saved filters
    const savedFilters = activeBookmark.filtersState.activeFilters;
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

      // Apply saved filters from bookmark
      for (const [filterId, filterValue] of Object.entries(savedFilters)) {
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

    return data;
  }, [fixtureData, activeBookmark, activeBookmarkId]);

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
            isLoading={isLoadingFixtures}
            loadingRowCount={15}
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

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        data={fixtureData}
        filteredData={filteredData}
        bookmarkData={bookmarkData}
        availableColumns={availableColumnsForExport}
        visibleColumns={visibleColumnsForExport}
        isDirty={isDirty}
        bookmarkName={activeBookmark?.name}
      />
    </>
  );
}

export default Fixtures;
