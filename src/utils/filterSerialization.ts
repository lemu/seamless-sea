import type { FilterValue } from "@rafal.lemieszewski/tide-ui";

/**
 * Serializes filter values to a URL-safe string format
 * Format: "key1:val1,val2|key2:range:min-max|key3:date:start-end"
 *
 * Examples:
 * - Multiselect: "vessels:Ship1,Ship2,Ship3"
 * - Number range: "cargoQuantity:range:5000-10000"
 * - Date range: "cpDate:date:1640000000000-1650000000000"
 */
export function serializeFilters(
  filters: Record<string, FilterValue>
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;

    if (Array.isArray(value)) {
      // Check if it's a date range (array of Date objects)
      if (value.length === 2 && value[0] instanceof Date && value[1] instanceof Date) {
        // Date range: "cpDate:date:timestamp1-timestamp2"
        const [start, end] = value as [Date, Date];
        parts.push(`${key}:date:${start.getTime()}-${end.getTime()}`);
      } else {
        // Multiselect: "vessels:Ship1,Ship2,Ship3"
        const encodedValues = value.map((v) =>
          encodeURIComponent(String(v))
        );
        parts.push(`${key}:${encodedValues.join(",")}`);
      }
    } else if (
      typeof value === "object" &&
      value !== null &&
      "min" in value &&
      "max" in value
    ) {
      // Number range: "cargoQuantity:range:5000-10000"
      parts.push(`${key}:range:${value.min}-${value.max}`);
    }
  }

  return parts.join("|");
}

/**
 * Deserializes a URL string back to filter values
 *
 * @param encoded - The encoded filter string from URL
 * @returns Object with filter key-value pairs
 */
export function deserializeFilters(
  encoded: string
): Record<string, FilterValue> {
  if (!encoded) return {};

  const filters: Record<string, FilterValue> = {};
  const parts = encoded.split("|");

  for (const part of parts) {
    if (!part) continue;

    const [key, ...valueParts] = part.split(":");

    if (valueParts[0] === "range") {
      // Number range: "cargoQuantity:range:5000-10000"
      const [minStr, maxStr] = valueParts[1].split("-");
      filters[key] = {
        min: Number(minStr),
        max: Number(maxStr),
      };
    } else if (valueParts[0] === "date") {
      // Date range: "cpDate:date:timestamp1-timestamp2"
      const [startStr, endStr] = valueParts[1].split("-");
      filters[key] = [
        new Date(Number(startStr)),
        new Date(Number(endStr)),
      ];
    } else {
      // Multiselect: "vessels:Ship1,Ship2,Ship3"
      const encodedValues = valueParts.join(":"); // Rejoin in case value contained ':'
      filters[key] = encodedValues
        .split(",")
        .map((v) => decodeURIComponent(v));
    }
  }

  return filters;
}

/**
 * Checks if two filter objects are equal (order-insensitive for arrays)
 *
 * @param filters1 - First filter object
 * @param filters2 - Second filter object
 * @returns True if filters are equivalent
 */
export function areFiltersEqual(
  filters1: Record<string, FilterValue>,
  filters2: Record<string, FilterValue>
): boolean {
  const keys1 = Object.keys(filters1).sort();
  const keys2 = Object.keys(filters2).sort();

  // Check if same number of keys
  if (keys1.length !== keys2.length) return false;

  // Check if all keys match
  if (keys1.some((key, index) => key !== keys2[index])) return false;

  // Check if all values match
  for (const key of keys1) {
    const val1 = filters1[key];
    const val2 = filters2[key];

    // Handle array values (multiselect or date ranges)
    if (Array.isArray(val1) && Array.isArray(val2)) {
      // Date range
      if (val1[0] instanceof Date && val2[0] instanceof Date) {
        if (
          val1[0].getTime() !== val2[0].getTime() ||
          val1[1].getTime() !== val2[1].getTime()
        ) {
          return false;
        }
      } else {
        // Multiselect (order-insensitive)
        const sorted1 = [...val1].sort();
        const sorted2 = [...val2].sort();
        if (
          sorted1.length !== sorted2.length ||
          sorted1.some((v, i) => v !== sorted2[i])
        ) {
          return false;
        }
      }
    } else if (
      typeof val1 === "object" &&
      val1 !== null &&
      typeof val2 === "object" &&
      val2 !== null
    ) {
      // Number range
      if (
        "min" in val1 &&
        "max" in val1 &&
        "min" in val2 &&
        "max" in val2
      ) {
        if (val1.min !== val2.min || val1.max !== val2.max) {
          return false;
        }
      } else {
        return false;
      }
    } else {
      // Direct comparison
      if (val1 !== val2) return false;
    }
  }

  return true;
}
