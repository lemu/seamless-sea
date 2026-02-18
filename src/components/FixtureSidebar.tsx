import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
  Icon,
  Flag,
} from "@rafal.lemieszewski/tide-ui";
import { FormattedActivityLogDescription, ActivityLogExpandableContent } from "./ActivityLogDescription";
import { ApprovalSignatureRow } from "./ApprovalSignatureRow";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  formatLaycanRange,
  formatCargo,
  formatCurrency,
  formatRate,
  formatPercent,
  formatQuantity,
  reformatCurrencyString,
} from "../utils/dataUtils";
import {
  calculateFreightSavings,
  calculateDemurrageSavings,
  calculateFreightVsMarket,
} from "../utils/fixtureCalculations";
import type { ActivityLogEntry } from "../types/activity";
import type { FieldChangeData } from "../types/fixture";
import type { FixtureData } from "../routes/Fixtures";
import { getStatusLabel, getCompanyInitials } from "../routes/Fixtures";

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

// Helper function to transform field changes for display
const transformFieldChanges = (
  fieldChanges: FieldChangeData[] | undefined,
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
          label: getStatusLabel('contract-working-copy'),
        },
        value: change.newValue || '',
        oldValue: change.oldValue || '',
      };
    });
};

export function FixtureSidebar({
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

  // Combine and sort activity logs (oldest first)
  const allActivityLogs = useMemo((): ActivityLogEntry[] => {
    const logs = [
      ...(contractActivityLog || []),
      ...(negotiationActivityLog || []),
    ] as ActivityLogEntry[];
    return logs.sort((a, b) => a.timestamp - b.timestamp); // Oldest first
  }, [contractActivityLog, negotiationActivityLog]);

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" overlay={false} className="flex flex-col gap-0 bg-[var(--color-surface-base)] p-0" style={{ width: '640px', maxWidth: '640px' }}>
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
                            <FixtureStatus value="negotiation-fixed" size="sm" lowercase={false} asBadge />
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
                            <FixtureStatus value="contract-working-copy" size="sm" lowercase={false} asBadge />
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>

                      {/* Contract Approval */}
                      {fixture.approvalSummary && fixture.approvals && fixture.approvalSummary.total > 0 && (
                        <ApprovalSignatureRow
                          label="Contract Approval"
                          type="approval"
                          records={fixture.approvals}
                          summary={fixture.approvalSummary}
                        />
                      )}

                      {/* Contract Signature */}
                      {fixture.signatureSummary && fixture.signatures && fixture.signatureSummary.total > 0 && (
                        <ApprovalSignatureRow
                          label="Contract Signature"
                          type="signature"
                          records={fixture.signatures}
                          summary={fixture.signatureSummary}
                        />
                      )}
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
                              {chartererChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
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
                              {brokerChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
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
                              {ownerChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
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
                          <AttributesValue>{formatQuantity(fixture.vessel.grt, "mt")}</AttributesValue>
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
                          <AttributesValue>{formatQuantity(fixture.vessel.dwt, "mt")}</AttributesValue>
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
                            {fixture.vessel.speedKnots ? `${fixture.vessel.speedKnots} knots` : '—'} • {fixture.vessel.consumptionPerDay ? `${formatQuantity(fixture.vessel.consumptionPerDay)} l/day` : '—'}
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
                          {fixture.loadPort?.name
                            ? `${fixture.loadPort.name}, ${fixture.loadPort.countryCode}`
                            : "Not specified"}
                          {hasLoadPortChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasLoadPortChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {loadPortChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
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
                          {fixture.dischargePort?.name
                            ? `${fixture.dischargePort.name}, ${fixture.dischargePort.countryCode}`
                            : "Not specified"}
                          {hasDischargePortChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasDischargePortChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {dischargePortChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasCargoChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasCargoChanges}>
                        <AttributesLabel>Cargo</AttributesLabel>
                        <AttributesValue>
                          {fixture.cargoType?.name && fixture.contract?.quantity
                            ? formatCargo(
                                fixture.contract.quantity,
                                fixture.contract.quantityUnit || "MT",
                                fixture.cargoType.name
                              )
                            : "Not specified"}
                          {hasCargoChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasCargoChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {cargoChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasLaycanChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasLaycanChanges}>
                        <AttributesLabel>Laycan</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.laycanStart && fixture.contract?.laycanEnd
                            ? formatLaycanRange(fixture.contract.laycanStart, fixture.contract.laycanEnd)
                            : "Not specified"}
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
                        <AttributesValue>
                          {fixture.typeOfContract || "Not specified"}
                        </AttributesValue>
                      </AttributesRow>
                    </AttributesItem>

                    <AttributesItem collapsible={hasFreightRateChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasFreightRateChanges}>
                        <AttributesLabel>Freight Rate</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.freightRate
                            ? formatRate(parseFloat(fixture.contract.freightRate.replace(/[^0-9.]/g, '')), "/mt")
                            : "Not specified"}
                          {hasFreightRateChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasFreightRateChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {freightRateChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    <AttributesItem collapsible={hasDemurrageChanges} defaultOpen={false}>
                      <AttributesRow asCollapsibleTrigger={hasDemurrageChanges}>
                        <AttributesLabel>Demurrage / Despatch</AttributesLabel>
                        <AttributesValue>
                          {fixture.contract?.demurrageRate
                            ? reformatCurrencyString(fixture.contract.demurrageRate)
                            : "Not specified"}
                          {hasDemurrageChanges && <AttributesChevron />}
                        </AttributesValue>
                      </AttributesRow>
                      {hasDemurrageChanges && (
                        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
                          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
                            <ActivityLog>
                              {demurrageChanges.map((entry, index) => {
                                const userName = entry.user?.name || 'System';
                                const userInitials = userName === 'System' ? 'S' : userName.split(' ').map(n => n[0]).join('');

                                return (
                                <ActivityLogItem key={index}>
                                  <ActivityLogHeader>
                                    <Avatar size="xxs">
                                      <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <ActivityLogDescription>
                                      <span className="text-body-medium-sm">{userName}</span>
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
                                );
                              })}
                            </ActivityLog>
                          </div>
                        </AttributesContent>
                      )}
                    </AttributesItem>

                    {/* Gross Freight */}
                    {fixture.negotiation?.grossFreight && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Gross Freight</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.grossFreight)}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {/* Analytics - Hidden in "More details" */}
                    {fixture.negotiation?.highestFreightRateIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest freight indication</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.highestFreightRateIndication, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestFreightRateIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest freight indication</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.lowestFreightRateIndication, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstFreightRateIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First freight indication</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.firstFreightRateIndication, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.highestFreightRateLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest freight (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.highestFreightRateLastDay, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestFreightRateLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest freight (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.lowestFreightRateLastDay, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstFreightRateLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First freight (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.firstFreightRateLastDay, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(() => {
                      const savings = calculateFreightSavings(
                        fixture.negotiation?.highestFreightRateIndication,
                        fixture.negotiation?.freightRate
                      );
                      if (!savings) return null;
                      const finalRate = fixture.negotiation?.freightRate ? parseFloat(fixture.negotiation.freightRate.replace(/[^0-9.]/g, '')) : 0;
                      const savingsAmount = (fixture.negotiation?.highestFreightRateIndication || 0) - finalRate;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Freight savings from highest</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)] flex items-center gap-1">
                              {formatRate(savingsAmount)} ({formatPercent(savings)})
                              <Icon name="CheckCircle" size="sm" />
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {(() => {
                      if (!fixture.negotiation?.firstFreightRateLastDay || !fixture.negotiation?.freightRate) return null;
                      const finalRate = parseFloat(fixture.negotiation.freightRate.replace(/[^0-9.]/g, ''));
                      const improvement = fixture.negotiation.firstFreightRateLastDay - finalRate;
                      const improvementPercent = (improvement / fixture.negotiation.firstFreightRateLastDay) * 100;
                      if (improvement <= 0) return null;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Freight last day improvement</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)]">
                              {formatRate(improvement)} ({formatPercent(improvementPercent)})
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {fixture.negotiation?.marketIndex && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>
                            {fixture.negotiation.marketIndexName || "Market index"}
                          </AttributesLabel>
                          <AttributesValue>
                            {formatRate(fixture.negotiation.marketIndex, "/mt")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(() => {
                      const vsMarket = calculateFreightVsMarket(
                        fixture.negotiation?.freightRate,
                        fixture.negotiation?.marketIndex
                      );
                      if (vsMarket === null) return null;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>vs Market</AttributesLabel>
                            <AttributesValue
                              className={
                                vsMarket < 0
                                  ? "text-[var(--color-text-success)]"
                                  : "text-[var(--color-text-danger)]"
                              }
                            >
                              {formatPercent(vsMarket, 1, true)}
                              {vsMarket < 0 && (
                                <Icon
                                  name="CheckCircle"
                                  size="sm"
                                  className="inline ml-1"
                                />
                              )}
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {fixture.negotiation?.highestDemurrageIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest demurrage indication</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.highestDemurrageIndication, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestDemurrageIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest demurrage indication</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.lowestDemurrageIndication, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstDemurrageIndication && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First demurrage indication</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.firstDemurrageIndication, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.highestDemurrageLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Highest demurrage (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.highestDemurrageLastDay, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.lowestDemurrageLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>Lowest demurrage (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.lowestDemurrageLastDay, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.firstDemurrageLastDay && (
                      <AttributesItem hidden>
                        <AttributesRow>
                          <AttributesLabel>First demurrage (last day)</AttributesLabel>
                          <AttributesValue>
                            {formatCurrency(fixture.negotiation.firstDemurrageLastDay, "/day")}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {(() => {
                      const savings = calculateDemurrageSavings(
                        fixture.negotiation?.highestDemurrageIndication,
                        fixture.negotiation?.demurrageRate
                      );
                      if (!savings) return null;
                      const finalRate = fixture.negotiation?.demurrageRate ? parseFloat(fixture.negotiation.demurrageRate.replace(/[^0-9]/g, '')) : 0;
                      const savingsAmount = (fixture.negotiation?.highestDemurrageIndication || 0) - finalRate;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Demurrage savings from highest</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)] flex items-center gap-1">
                              {formatCurrency(savingsAmount)} ({formatPercent(savings)})
                              <Icon name="CheckCircle" size="sm" />
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {(() => {
                      if (!fixture.negotiation?.firstDemurrageLastDay || !fixture.negotiation?.demurrageRate) return null;
                      const finalRate = parseFloat(fixture.negotiation.demurrageRate.replace(/[^0-9]/g, ''));
                      const improvement = fixture.negotiation.firstDemurrageLastDay - finalRate;
                      const improvementPercent = (improvement / fixture.negotiation.firstDemurrageLastDay) * 100;
                      if (improvement <= 0) return null;
                      return (
                        <AttributesItem hidden>
                          <AttributesRow>
                            <AttributesLabel>Demurrage last day improvement</AttributesLabel>
                            <AttributesValue className="text-[var(--color-text-success)]">
                              {formatCurrency(improvement)} ({formatPercent(improvementPercent)})
                            </AttributesValue>
                          </AttributesRow>
                        </AttributesItem>
                      );
                    })()}

                    {/* Commissions - always visible */}
                    {fixture.negotiation?.addressCommissionPercent && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Address commission</AttributesLabel>
                          <AttributesValue>
                            {formatPercent(fixture.negotiation.addressCommissionPercent, 2)}
                            {fixture.negotiation.addressCommissionTotal && ` (${formatCurrency(fixture.negotiation.addressCommissionTotal)})`}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}

                    {fixture.negotiation?.brokerCommissionPercent && (
                      <AttributesItem>
                        <AttributesRow>
                          <AttributesLabel>Broker commission</AttributesLabel>
                          <AttributesValue>
                            {formatPercent(fixture.negotiation.brokerCommissionPercent, 2)}
                            {fixture.negotiation.brokerCommissionTotal && ` (${formatCurrency(fixture.negotiation.brokerCommissionTotal)})`}
                          </AttributesValue>
                        </AttributesRow>
                      </AttributesItem>
                    )}
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
