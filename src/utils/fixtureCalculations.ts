/**
 * Helper functions for calculating derived fields in fixture data
 */

/**
 * Calculate savings percentage from highest rate to final rate.
 * Used for both freight and demurrage savings.
 * @param highest - Highest rate indication
 * @param final - Final rate as string or number
 * @returns Savings percentage or null if data insufficient
 */
export function calculateSavingsPercent(
  highest: number | undefined,
  final: string | number | undefined
): number | null {
  if (highest == null || final == null || highest === 0) return null;

  const finalNum = typeof final === 'string' ? parseFloat(final) : final;
  if (isNaN(finalNum)) return null;

  return ((highest - finalNum) / highest) * 100;
}

// Backward-compatible aliases
export const calculateFreightSavings = calculateSavingsPercent;
export const calculateDemurrageSavings = calculateSavingsPercent;

/**
 * Calculate days between two dates
 * @param startDate - Start date timestamp (milliseconds)
 * @param endDate - End date timestamp (milliseconds)
 * @returns Number of days or null if data insufficient
 */
export function calculateDaysBetween(
  startDate: number | undefined,
  endDate: number | undefined
): number | null {
  if (startDate == null || endDate == null) return null;

  const diffMs = endDate - startDate;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate freight rate vs market index percentage
 * @param finalRate - Final freight rate
 * @param marketIndex - Market index rate
 * @returns Percentage difference or null if data insufficient
 */
export function calculateFreightVsMarket(
  finalRate: string | number | undefined,
  marketIndex: number | undefined
): number | null {
  if (finalRate == null || marketIndex == null || marketIndex === 0) return null;

  const final = typeof finalRate === 'string' ? parseFloat(finalRate) : finalRate;
  if (isNaN(final)) return null;

  return ((final - marketIndex) / marketIndex) * 100;
}

/**
 * Format days between dates as a string
 * @param days - Number of days
 * @returns Formatted string like "5 days" or "-"
 */
export function formatDays(days: number | null): string {
  if (days === null) return "-";

  if (days === 0) return "Same day";
  if (days === 1) return "1 day";

  return `${days} days`;
}
