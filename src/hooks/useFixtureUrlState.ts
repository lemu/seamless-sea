import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";

/**
 * Custom hook for managing fixture table state in the URL
 * Enables shareable URLs with complete filter, sorting, and pagination state
 */
export function useFixtureUrlState() {
  const [state, setState] = useQueryStates({
    // Bookmark
    bookmark: parseAsString.withDefault("system-all"),

    // Pagination
    cursor: parseAsString, // Cursor for pagination (format: "timestamp:id")
    limit: parseAsInteger.withDefault(25),

    // Filters (serialized as compact string)
    filters: parseAsString,

    // Sorting (format: "field:direction", e.g., "lastUpdated:desc")
    sort: parseAsString.withDefault("lastUpdated:desc"),

    // Grouping (format: field name)
    group: parseAsString.withDefault("fixtureId"),

    // Search (comma-separated terms)
    search: parseAsString, // e.g., "ship1,singapore,iron ore"
  });

  return { state, setState };
}
