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
import { formatRate, formatPercent } from "../utils/dataUtils";

interface FreightAnalyticsProps {
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
  finalRateString?: string; // e.g., "$45.50/mt" or "WS 150"

  // Market comparison
  marketIndex?: number;
  marketIndexName?: string;

  // Commission and gross freight
  grossFreight?: number;
  addressCommissionPercent?: number;
  addressCommissionTotal?: number;
  brokerCommissionPercent?: number;
  brokerCommissionTotal?: number;
}

/**
 * FreightAnalytics
 *
 * Displays a collapsible section with detailed freight rate analytics including:
 * - Negotiation history (highest/lowest/first indications)
 * - Last day activity
 * - Savings achieved
 * - Final rate
 * - Market comparison
 *
 * Example usage:
 * ```tsx
 * <FreightAnalytics
 *   highestIndication={52.00}
 *   lowestIndication={43.00}
 *   firstIndication={50.00}
 *   finalRate={45.50}
 *   finalRateString="$45.50/mt"
 *   marketIndex={46.57}
 *   marketIndexName="Baltic Index"
 * />
 * ```
 */
export function FreightAnalytics({
  highestIndication,
  lowestIndication,
  firstIndication,
  highestLastDay,
  lowestLastDay,
  firstLastDay,
  finalRate,
  finalRateString,
  marketIndex,
  marketIndexName,
}: FreightAnalyticsProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Calculate savings if we have the data
  let savingsFromHighest: { amount: number; percent: number } | null = null;
  let lastDayImprovement: { amount: number; percent: number } | null = null;
  let marketComparison: { amount: number; percent: number } | null = null;

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

  if (marketIndex && finalRate) {
    const amount = finalRate - marketIndex;
    const percent = (amount / marketIndex) * 100;
    marketComparison = { amount, percent };
  }

  // Helper to format currency values for this component (rate-style, 2 decimals, no suffix)
  const formatCurrencyValue = (value: number): string => {
    return formatRate(value).replace(/\/.*$/, ""); // Remove any suffix
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
    !marketIndex
  ) {
    return null;
  }

  return (
    <AttributesRow>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <AttributesLabel>Freight Analytics</AttributesLabel>
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
                        {formatCurrencyValue(highestIndication)}/mt
                      </span>
                    </div>
                  )}
                  {lowestIndication && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Lowest indication:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(lowestIndication)}/mt
                      </span>
                    </div>
                  )}
                  {firstIndication && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        First indication:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(firstIndication)}/mt
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
                        {formatCurrencyValue(highestLastDay)}/mt
                      </span>
                    </div>
                  )}
                  {lowestLastDay && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        Lowest:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(lowestLastDay)}/mt
                      </span>
                    </div>
                  )}
                  {firstLastDay && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        First:
                      </span>
                      <span className="text-[var(--color-text-primary)]">
                        {formatCurrencyValue(firstLastDay)}/mt
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
                  {finalRateString || `${formatCurrencyValue(finalRate!)}/mt`}
                </div>
              </div>
            )}

            {/* Market Comparison */}
            {marketIndex && marketComparison && (
              <div>
                <div className="text-body-strong-sm text-[var(--color-text-primary)] mb-2">
                  Market Comparison
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      {marketIndexName || "Market index"}:
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      {formatCurrencyValue(marketIndex)}/mt
                    </span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      vs Market:
                    </span>
                    <span
                      className={
                        marketComparison.percent < 0
                          ? "text-[var(--color-text-success)]"
                          : "text-[var(--color-text-danger)]"
                      }
                    >
                      {formatPercentValue(marketComparison.percent)}
                      {marketComparison.percent < 0 && (
                        <Icon
                          name="CheckCircle"
                          size="sm"
                          className="inline ml-1"
                        />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </AttributesRow>
  );
}
