import * as React from "react";
import {
  Icon,
  AttributesRow,
  AttributesLabel,
  AttributesValue,
  AttributesChevron,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@rafal.lemieszewski/tide-ui";
import { formatCurrency, formatPercent } from "../utils/dataUtils";

interface DemurrageAnalyticsProps {
  // Negotiation history
  highestIndication?: number;
  lowestIndication?: number;
  firstIndication?: number;

  // Last day activity
  highestLastDay?: number;
  lowestLastDay?: number;
  firstLastDay?: number;

  // Final rate
  finalRate?: number;
  finalRateString?: string; // e.g., "$12,500/day"
}

/**
 * DemurrageAnalytics
 *
 * Displays a collapsible section with detailed demurrage rate analytics including:
 * - Negotiation history (highest/lowest/first indications)
 * - Last day activity
 * - Savings achieved
 * - Final rate
 *
 * Example usage:
 * ```tsx
 * <DemurrageAnalytics
 *   highestIndication={15000}
 *   lowestIndication={11000}
 *   firstIndication={14000}
 *   finalRate={12500}
 *   finalRateString="$12,500/day"
 * />
 * ```
 */
export function DemurrageAnalytics({
  highestIndication,
  lowestIndication,
  firstIndication,
  highestLastDay,
  lowestLastDay,
  firstLastDay,
  finalRate,
  finalRateString,
}: DemurrageAnalyticsProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Calculate savings if we have the data
  let savingsFromHighest: { amount: number; percent: number } | null = null;
  let lastDayImprovement: { amount: number; percent: number } | null = null;

  if (highestIndication && finalRate) {
    const amount = highestIndication - finalRate;
    const percent = (amount / highestIndication) * 100;
    savingsFromHighest = { amount, percent };
  }

  if (firstLastDay && finalRate) {
    const amount = firstLastDay - finalRate;
    const percent = (amount / firstLastDay) * 100;
    lastDayImprovement = { amount, percent };
  }

  // Helper to format currency values for this component (no decimal places, no suffix)
  const formatCurrencyValue = (value: number): string => {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Helper to format percent with sign for this component
  const formatPercentValue = (value: number): string => {
    return formatPercent(value, 1, true);
  };

  // If no analytics data available, don't render
  if (
    !highestIndication &&
    !lowestIndication &&
    !firstIndication &&
    !finalRate
  ) {
    return null;
  }

  return (
    <AttributesRow>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <AttributesLabel>Demurrage Analytics</AttributesLabel>
        <AttributesValue>
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center gap-2 w-full text-left"
              aria-expanded={isExpanded}
            >
              <span className="text-body-sm text-[var(--color-text-link)]">
                {isExpanded ? "Hide Analytics" : "Show Analytics"}
              </span>
              <AttributesChevron />
            </button>
          </CollapsibleTrigger>
        </AttributesValue>

        <CollapsibleContent>
          <div className="space-y-4 pt-2">
            {/* Negotiation History */}
            {(highestIndication || lowestIndication || firstIndication) && (
              <div>
                <div className="text-body-strong-sm text-[var(--color-text-primary)] mb-2">
                  Negotiation History
                </div>
                <div className="space-y-1">
                  {highestIndication && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Highest indication:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(highestIndication)}/day
                      </span>
                    </div>
                  )}
                  {lowestIndication && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Lowest indication:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(lowestIndication)}/day
                      </span>
                    </div>
                  )}
                  {firstIndication && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        First indication:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(firstIndication)}/day
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Day Activity */}
            {(highestLastDay || lowestLastDay || firstLastDay) && (
              <div>
                <div className="text-body-strong-sm text-[var(--color-text-primary)] mb-2">
                  Last Day Activity
                </div>
                <div className="space-y-1">
                  {highestLastDay && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Highest:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(highestLastDay)}/day
                      </span>
                    </div>
                  )}
                  {lowestLastDay && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Lowest:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(lowestLastDay)}/day
                      </span>
                    </div>
                  )}
                  {firstLastDay && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        First:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(firstLastDay)}/day
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Savings */}
            {(savingsFromHighest || lastDayImprovement) && (
              <div>
                <div className="text-body-strong-sm text-[var(--color-text-primary)] mb-2">
                  Savings
                </div>
                <div className="space-y-1">
                  {savingsFromHighest && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        From highest:
                      </span>
                      <span className="text-[var(--color-text-success)] flex items-center gap-1">
                        {formatCurrencyValue(savingsFromHighest.amount)} (
                        {formatPercentValue(savingsFromHighest.percent)})
                        <Icon name="CheckCircle" size="sm" />
                      </span>
                    </div>
                  )}
                  {lastDayImprovement && lastDayImprovement.amount > 0 && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Last day improvement:
                      </span>
                      <span className="text-[var(--color-text-success)]">
                        {formatCurrencyValue(lastDayImprovement.amount)} (
                        {formatPercentValue(lastDayImprovement.percent)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Final Rate */}
            {(finalRate || finalRateString) && (
              <div>
                <div className="text-body-strong-sm text-[var(--color-text-primary)] mb-2">
                  Final Rate
                </div>
                <div className="text-body-sm text-[var(--color-text-primary)]">
                  {finalRateString || `${formatCurrencyValue(finalRate!)}/day`}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </AttributesRow>
  );
}
