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
