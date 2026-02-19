/**
 * Get the most recent value from multiple entities based on updatedAt timestamp
 * Useful when data exists in order, negotiation, and contract but we want the latest
 */

interface EntityWithTimestamp {
  updatedAt?: number;
  [key: string]: unknown;
}

/**
 * Get the most recent value for a field across multiple entities
 * @param entities - Array of entities with updatedAt timestamps
 * @param fieldName - Name of the field to retrieve
 * @returns The most recent value, or undefined if not found
 */
export function getMostRecentValue<T>(
  entities: EntityWithTimestamp[],
  fieldName: string
): T | undefined {
  // Filter out null/undefined entities
  const validEntities = entities.filter(
    (entity) => entity !== null && entity !== undefined
  );

  if (validEntities.length === 0) {
    return undefined;
  }

  // Sort by updatedAt descending (most recent first)
  const sorted = [...validEntities].sort((a, b) => {
    const aTime = a.updatedAt || 0;
    const bTime = b.updatedAt || 0;
    return bTime - aTime;
  });

  // Find the first entity with a non-null/undefined value for the field
  for (const entity of sorted) {
    const value = entity[fieldName];
    if (value !== null && value !== undefined) {
      return value as T;
    }
  }

  return undefined;
}

/**
 * Get the most recently updated entity from an array
 * @param entities - Array of entities with updatedAt timestamps
 * @returns The most recently updated entity, or undefined if array is empty
 */
export function getMostRecentEntity<T extends EntityWithTimestamp>(
  entities: (T | null | undefined)[]
): T | undefined {
  const validEntities = entities.filter(
    (entity): entity is T => entity !== null && entity !== undefined
  );

  if (validEntities.length === 0) {
    return undefined;
  }

  return validEntities.reduce((mostRecent, current) => {
    const mostRecentTime = mostRecent.updatedAt || 0;
    const currentTime = current.updatedAt || 0;
    return currentTime > mostRecentTime ? current : mostRecent;
  });
}

/**
 * Merge data from multiple entities, preferring values from more recent entities
 * @param entities - Array of entities with updatedAt timestamps (in priority order if timestamps are equal)
 * @param fieldNames - Array of field names to merge
 * @returns Object with merged values
 */
export function mergeRecentData<T extends Record<string, unknown>>(
  entities: EntityWithTimestamp[],
  fieldNames: string[]
): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const fieldName of fieldNames) {
    const value = getMostRecentValue(entities, fieldName);
    if (value !== undefined) {
      result[fieldName] = value;
    }
  }

  return result as Partial<T>;
}

/**
 * Format date/time display
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date range for laycan
 */
export function formatLaycanRange(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startStr = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endStr = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} – ${endStr}`;
}

/**
 * Format cargo display (quantity + type)
 */
export function formatCargo(
  quantity: number,
  unit: string,
  cargoName: string
): string {
  return `${quantity.toLocaleString()} ${unit.toLowerCase()} ${cargoName.toLowerCase()}`;
}

/**
 * Format currency with thousand separators and 2 decimal places
 * @param value - The numeric value to format
 * @param suffix - Optional suffix (e.g., "/day")
 * @returns Formatted currency string (e.g., "$46,919.00" or "$46,919.00/day")
 */
export function formatCurrency(value: number, suffix?: string): string {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return suffix ? `$${formatted}${suffix}` : `$${formatted}`;
}

/**
 * Format rate (smaller values, always 2 decimals)
 * @param value - The numeric value to format
 * @param suffix - Optional suffix (e.g., "/mt")
 * @returns Formatted rate string (e.g., "$12.50/mt")
 */
export function formatRate(value: number, suffix?: string): string {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return suffix ? `$${formatted}${suffix}` : `$${formatted}`;
}

/**
 * Format quantity with thousand separators (no decimals)
 * @param value - The numeric value to format
 * @param unit - Optional unit (e.g., "mt")
 * @returns Formatted quantity string (e.g., "50,000 mt")
 */
export function formatQuantity(value: number, unit?: string): string {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format percentage
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @param showSign - Whether to show + for positive values (default: false)
 * @returns Formatted percentage string (e.g., "15.6%" or "+5.2%")
 */
export function formatPercent(
  value: number,
  decimals: number = 1,
  showSign: boolean = false
): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * General pluralization utility
 * @param count - The count to use for pluralization
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + "s")
 * @returns Formatted string with count and pluralized word (e.g., "1 day", "5 days")
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const pluralForm = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Format duration in days with pluralization
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "today", "1 day", "5 days")
 */
export function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Format relative time display
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "Just now", "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return pluralize(minutes, "minute") + " ago";
  if (hours < 24) return pluralize(hours, "hour") + " ago";
  if (days === 1) return "Yesterday";
  if (days < 30) return pluralize(days, "day") + " ago";

  // For older dates, show the actual date
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format "Member since" display
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted member since string (e.g., "Member since Jan 2024")
 */
export function formatMemberSince(timestamp: number): string {
  const date = new Date(timestamp);
  return `Member since ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
}

/**
 * Convert kebab-case or snake_case to Title Case
 * @param value - The enum value to format (e.g., "voyage-charter", "time_charter")
 * @returns Formatted title case string (e.g., "Voyage Charter", "Time Charter")
 */
export function formatEnumLabel(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format country name from ISO code using Intl.DisplayNames
 * @param code - ISO 3166-1 alpha-2 country code (e.g., "NO", "US")
 * @returns Full country name (e.g., "Norway", "United States")
 */
export function formatCountryName(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/**
 * Parse and reformat a currency string to ensure thousand separators
 * Handles formats like "$45509/day" -> "$45,509/day"
 * @param value - The currency string to reformat
 * @returns Reformatted currency string with thousand separators
 */
export function reformatCurrencyString(value: string): string {
  const match = value.match(/^(\$?)(\d+(?:\.\d+)?)(.*?)$/);
  if (!match) return value;

  const [, prefix, numStr, suffix] = match;
  const num = parseFloat(numStr);
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: numStr.includes(".") ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Get human-readable status label from a status key.
 * Delegates to tide-ui's statusConfig for known statuses; falls back to formatEnumLabel.
 */
export function getStatusLabel(
  status: string,
  statusConfigMap: Record<string, { objectLabel: string; statusLabel: string }>
): string {
  const config = statusConfigMap[status as keyof typeof statusConfigMap];
  if (config) {
    return `${config.objectLabel} • ${config.statusLabel}`;
  }
  return formatEnumLabel(status);
}

/**
 * Get company initials for avatar fallback
 * @param companyName - The company name
 * @returns 1-2 character initials (e.g., "AB" for "Acme Bulk")
 */
export function getCompanyInitials(companyName: string): string {
  const words = companyName.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/**
 * Format a timestamp to a display-friendly string.
 * Handles null, undefined, string timestamps, and invalid dates.
 * @param timestamp - Unix timestamp (ms) or string representation
 * @returns Formatted string like "5 Jan 2025 14:30" or "–" for invalid input
 */
export function formatTimestamp(timestamp: number | string | undefined | null): string {
  if (timestamp === null || timestamp === undefined) return '–';

  const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;

  if (typeof ts !== 'number' || isNaN(ts)) return '–';

  const date = new Date(ts);
  if (isNaN(date.getTime())) return '–';

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}
