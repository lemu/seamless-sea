import {
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
  Avatar,
  AvatarImage,
  AvatarFallback,
  Icon,
  Flag,
} from "@rafal.lemieszewski/tide-ui";
import { ApprovalSignatureRow } from "./ApprovalSignatureRow";
import {
  formatLaycanRange,
  formatCargo,
  formatCurrency,
  formatRate,
  formatPercent,
  formatQuantity,
  reformatCurrencyString,
} from "../utils/dataUtils";
import { getStatusLabel, getCompanyInitials } from "../routes/Fixtures";
import type { FixtureData } from "../routes/Fixtures";
import type { FieldChangeData } from "../types/fixture";

// ============================================================================
// Change History Types and Helpers
// ============================================================================

export interface ChangeHistoryEntry {
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
export const transformFieldChanges = (
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

// ============================================================================
// FieldChangeHistory Component
// ============================================================================

export function FieldChangeHistory({
  label,
  value,
  changes,
}: {
  label: string;
  value: React.ReactNode;
  changes: ChangeHistoryEntry[];
}) {
  const hasChanges = changes.length > 0;
  return (
    <AttributesItem collapsible={hasChanges} defaultOpen={false}>
      <AttributesRow asCollapsibleTrigger={hasChanges}>
        <AttributesLabel>{label}</AttributesLabel>
        <AttributesValue>
          {value}
          {hasChanges && <AttributesChevron />}
        </AttributesValue>
      </AttributesRow>
      {hasChanges && (
        <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
          <div className="rounded bg-[var(--color-surface-sunken)] p-2">
            <ActivityLog>
              {changes.map((entry, index) => {
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
                        <span>{entry.action === 'created' ? `set ${label} to` : `changed ${label} from`}</span>
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
  );
}

// ============================================================================
// Props Interfaces
// ============================================================================

export interface FieldChangeDataProps {
  chartererChanges: ChangeHistoryEntry[];
  brokerChanges: ChangeHistoryEntry[];
  ownerChanges: ChangeHistoryEntry[];
  loadPortChanges: ChangeHistoryEntry[];
  dischargePortChanges: ChangeHistoryEntry[];
  cargoChanges: ChangeHistoryEntry[];
  laycanChanges: ChangeHistoryEntry[];
  freightRateChanges: ChangeHistoryEntry[];
  demurrageChanges: ChangeHistoryEntry[];
}

export interface FinancialAnalyticsProps {
  freightSavingsPercent: number | null;
  freightSavingsAmount: number | null;
  freightLastDayImprovement: number | null;
  freightLastDayImprovementPercent: number | null;
  freightVsMarket: number | null;
  demurrageSavingsPercent: number | null;
  demurrageSavingsAmount: number | null;
  demurrageLastDayImprovement: number | null;
  demurrageLastDayImprovementPercent: number | null;
}

export interface FixtureSidebarOverviewProps {
  fixture: FixtureData;
  fieldChangeData: FieldChangeDataProps;
  financialAnalytics: FinancialAnalyticsProps;
}

// ============================================================================
// FixtureSidebarOverview Component
// ============================================================================

export function FixtureSidebarOverview({
  fixture,
  fieldChangeData,
  financialAnalytics,
}: FixtureSidebarOverviewProps) {
  return (
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

          <AttributesList style={{ gridTemplateColumns: 'minmax(140px, auto) 1fr' }}>
            <AttributesGroup label="Involved Parties">
              <FieldChangeHistory
                label="Charterer"
                value={<>
                  <Avatar type="organization" size="xs">
                    <AvatarImage src={fixture.chartererAvatarUrl || undefined} alt={fixture.charterer} />
                    <AvatarFallback>{getCompanyInitials(fixture.charterer)}</AvatarFallback>
                  </Avatar>
                  {fixture.charterer}
                </>}
                changes={fieldChangeData.chartererChanges}
              />
              <FieldChangeHistory
                label="Broker"
                value={<>
                  <Avatar type="organization" size="xs">
                    <AvatarImage src={fixture.brokerAvatarUrl || undefined} alt={fixture.broker} />
                    <AvatarFallback>{getCompanyInitials(fixture.broker)}</AvatarFallback>
                  </Avatar>
                  {fixture.broker}
                </>}
                changes={fieldChangeData.brokerChanges}
              />
              <FieldChangeHistory
                label="Owner"
                value={<>
                  <Avatar type="organization" size="xs">
                    <AvatarImage src={fixture.ownerAvatarUrl || undefined} alt={fixture.owner} />
                    <AvatarFallback>{getCompanyInitials(fixture.owner)}</AvatarFallback>
                  </Avatar>
                  {fixture.owner}
                </>}
                changes={fieldChangeData.ownerChanges}
              />
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
              <FieldChangeHistory
                label="Load Port"
                value={<>
                  {fixture.loadPort?.countryCode && (
                    <Flag country={fixture.loadPort.countryCode.toLowerCase()} />
                  )}
                  {fixture.loadPort?.name
                    ? `${fixture.loadPort.name}, ${fixture.loadPort.countryCode}`
                    : "Not specified"}
                </>}
                changes={fieldChangeData.loadPortChanges}
              />
              <FieldChangeHistory
                label="Discharge Port"
                value={<>
                  {fixture.dischargePort?.countryCode && (
                    <Flag country={fixture.dischargePort.countryCode.toLowerCase()} />
                  )}
                  {fixture.dischargePort?.name
                    ? `${fixture.dischargePort.name}, ${fixture.dischargePort.countryCode}`
                    : "Not specified"}
                </>}
                changes={fieldChangeData.dischargePortChanges}
              />
              <FieldChangeHistory
                label="Cargo"
                value={fixture.cargoType?.name && fixture.contract?.quantity
                  ? formatCargo(
                      fixture.contract.quantity,
                      fixture.contract.quantityUnit || "MT",
                      fixture.cargoType.name
                    )
                  : "Not specified"}
                changes={fieldChangeData.cargoChanges}
              />
              <FieldChangeHistory
                label="Laycan"
                value={fixture.contract?.laycanStart && fixture.contract?.laycanEnd
                  ? formatLaycanRange(fixture.contract.laycanStart, fixture.contract.laycanEnd)
                  : "Not specified"}
                changes={fieldChangeData.laycanChanges}
              />
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

              <FieldChangeHistory
                label="Freight Rate"
                value={fixture.contract?.freightRate
                  ? formatRate(parseFloat(fixture.contract.freightRate.replace(/[^0-9.]/g, '')), "/mt")
                  : "Not specified"}
                changes={fieldChangeData.freightRateChanges}
              />
              <FieldChangeHistory
                label="Demurrage / Despatch"
                value={fixture.contract?.demurrageRate
                  ? reformatCurrencyString(fixture.contract.demurrageRate)
                  : "Not specified"}
                changes={fieldChangeData.demurrageChanges}
              />

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

              {financialAnalytics.freightSavingsPercent != null && (
                <AttributesItem hidden>
                  <AttributesRow>
                    <AttributesLabel>Freight savings from highest</AttributesLabel>
                    <AttributesValue className="text-[var(--color-text-success)] flex items-center gap-1">
                      {formatRate(financialAnalytics.freightSavingsAmount ?? 0)} ({formatPercent(financialAnalytics.freightSavingsPercent)})
                      <Icon name="CheckCircle" size="sm" />
                    </AttributesValue>
                  </AttributesRow>
                </AttributesItem>
              )}

              {financialAnalytics.freightLastDayImprovement != null && financialAnalytics.freightLastDayImprovementPercent != null && (
                <AttributesItem hidden>
                  <AttributesRow>
                    <AttributesLabel>Freight last day improvement</AttributesLabel>
                    <AttributesValue className="text-[var(--color-text-success)]">
                      {formatRate(financialAnalytics.freightLastDayImprovement)} ({formatPercent(financialAnalytics.freightLastDayImprovementPercent)})
                    </AttributesValue>
                  </AttributesRow>
                </AttributesItem>
              )}

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

              {financialAnalytics.freightVsMarket !== null && (
                <AttributesItem hidden>
                  <AttributesRow>
                    <AttributesLabel>vs Market</AttributesLabel>
                    <AttributesValue
                      className={
                        financialAnalytics.freightVsMarket < 0
                          ? "text-[var(--color-text-success)]"
                          : "text-[var(--color-text-danger)]"
                      }
                    >
                      {formatPercent(financialAnalytics.freightVsMarket, 1, true)}
                      {financialAnalytics.freightVsMarket < 0 && (
                        <Icon
                          name="CheckCircle"
                          size="sm"
                          className="inline ml-1"
                        />
                      )}
                    </AttributesValue>
                  </AttributesRow>
                </AttributesItem>
              )}

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

              {financialAnalytics.demurrageSavingsPercent != null && (
                <AttributesItem hidden>
                  <AttributesRow>
                    <AttributesLabel>Demurrage savings from highest</AttributesLabel>
                    <AttributesValue className="text-[var(--color-text-success)] flex items-center gap-1">
                      {formatCurrency(financialAnalytics.demurrageSavingsAmount ?? 0)} ({formatPercent(financialAnalytics.demurrageSavingsPercent)})
                      <Icon name="CheckCircle" size="sm" />
                    </AttributesValue>
                  </AttributesRow>
                </AttributesItem>
              )}

              {financialAnalytics.demurrageLastDayImprovement != null && financialAnalytics.demurrageLastDayImprovementPercent != null && (
                <AttributesItem hidden>
                  <AttributesRow>
                    <AttributesLabel>Demurrage last day improvement</AttributesLabel>
                    <AttributesValue className="text-[var(--color-text-success)]">
                      {formatCurrency(financialAnalytics.demurrageLastDayImprovement)} ({formatPercent(financialAnalytics.demurrageLastDayImprovementPercent)})
                    </AttributesValue>
                  </AttributesRow>
                </AttributesItem>
              )}

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
        </Card>
      </div>
    </TabsContent>
  );
}
