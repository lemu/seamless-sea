import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  Icon,
} from "@rafal.lemieszewski/tide-ui";
import { FixtureSidebarOverview } from "./FixtureSidebarOverview";
import { FixtureSidebarActivity } from "./FixtureSidebarActivity";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  formatLaycanRange,
  formatCargo,
} from "../utils/dataUtils";
import {
  calculateFreightSavings,
  calculateDemurrageSavings,
  calculateFreightVsMarket,
} from "../utils/fixtureCalculations";
import type { ActivityLogEntry } from "../types/activity";
import type { FieldChangeData } from "../types/fixture";
import type { FixtureData } from "../routes/Fixtures";
import { getStatusLabel } from "../routes/Fixtures";

// Helper function to transform field changes for display
interface ChangeHistoryEntry {
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: 'created' | 'updated';
  status: {
    value: string;
    label: string;
  };
  value: string;
  oldValue?: string;
}

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

  // Pre-compute field changes for conditional rendering
  const fieldChangeData = useMemo(() => {
    const chartererChanges = transformFieldChanges(fieldChanges, "chartererId");
    const brokerChanges = transformFieldChanges(fieldChanges, "brokerId");
    const ownerChanges = transformFieldChanges(fieldChanges, "ownerId");
    const loadPortChanges = transformFieldChanges(fieldChanges, "loadPortId");
    const dischargePortChanges = transformFieldChanges(fieldChanges, "dischargePortId");
    const cargoChanges = transformFieldChanges(fieldChanges, "quantity");
    const laycanChanges = transformFieldChanges(fieldChanges, "laycanStart");
    const freightRateChanges = transformFieldChanges(fieldChanges, "freightRate");
    const demurrageChanges = transformFieldChanges(fieldChanges, "demurrageRate");
    return {
      chartererChanges, brokerChanges, ownerChanges,
      loadPortChanges, dischargePortChanges,
      cargoChanges, laycanChanges,
      freightRateChanges, demurrageChanges,
    };
  }, [fieldChanges]);

  // Pre-compute financial analytics (freight/demurrage savings, improvements, vs market)
  const financialAnalytics = useMemo(() => {
    const neg = fixture.negotiation;

    // Freight savings from highest indication
    const freightSavingsPercent = calculateFreightSavings(
      neg?.highestFreightRateIndication,
      neg?.freightRate
    );
    let freightSavingsAmount: number | null = null;
    if (freightSavingsPercent != null && neg?.freightRate) {
      const finalRate = parseFloat(neg.freightRate.replace(/[^0-9.]/g, ''));
      freightSavingsAmount = (neg.highestFreightRateIndication ?? 0) - finalRate;
    }

    // Freight last day improvement
    let freightLastDayImprovement: number | null = null;
    let freightLastDayImprovementPercent: number | null = null;
    if (neg?.firstFreightRateLastDay && neg?.freightRate) {
      const finalRate = parseFloat(neg.freightRate.replace(/[^0-9.]/g, ''));
      const improvement = neg.firstFreightRateLastDay - finalRate;
      if (improvement > 0) {
        freightLastDayImprovement = improvement;
        freightLastDayImprovementPercent = (improvement / neg.firstFreightRateLastDay) * 100;
      }
    }

    // Freight vs market
    const freightVsMarket = calculateFreightVsMarket(
      neg?.freightRate,
      neg?.marketIndex
    );

    // Demurrage savings from highest indication
    const demurrageSavingsPercent = calculateDemurrageSavings(
      neg?.highestDemurrageIndication,
      neg?.demurrageRate
    );
    let demurrageSavingsAmount: number | null = null;
    if (demurrageSavingsPercent != null && neg?.demurrageRate) {
      const finalRate = parseFloat(neg.demurrageRate.replace(/[^0-9.]/g, ''));
      demurrageSavingsAmount = (neg.highestDemurrageIndication ?? 0) - finalRate;
    }

    // Demurrage last day improvement
    let demurrageLastDayImprovement: number | null = null;
    let demurrageLastDayImprovementPercent: number | null = null;
    if (neg?.firstDemurrageLastDay && neg?.demurrageRate) {
      const finalRate = parseFloat(neg.demurrageRate.replace(/[^0-9.]/g, ''));
      const improvement = neg.firstDemurrageLastDay - finalRate;
      if (improvement > 0) {
        demurrageLastDayImprovement = improvement;
        demurrageLastDayImprovementPercent = (improvement / neg.firstDemurrageLastDay) * 100;
      }
    }

    return {
      freightSavingsPercent,
      freightSavingsAmount,
      freightLastDayImprovement,
      freightLastDayImprovementPercent,
      freightVsMarket,
      demurrageSavingsPercent,
      demurrageSavingsAmount,
      demurrageLastDayImprovement,
      demurrageLastDayImprovementPercent,
    };
  }, [fixture.negotiation]);

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
          <FixtureSidebarOverview
            fixture={fixture}
            fieldChangeData={fieldChangeData}
            financialAnalytics={financialAnalytics}
          />
          <FixtureSidebarActivity
            fixture={fixture}
            allActivityLogs={allActivityLogs}
          />
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
