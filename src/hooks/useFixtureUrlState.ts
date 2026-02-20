import { useQueryStates, parseAsArrayOf, parseAsString, parseAsInteger, parseAsIsoDateTime, parseAsBoolean, parseAsJson } from 'nuqs';
import { useMemo, useCallback } from 'react';
import type { FilterValue } from '@rafal.lemieszewski/tide-ui';

// ── JSON shape for the `f` catch-all filter param ──────────────────────
// Each entry maps a filter key to one of:
//   string[]             → multiselect
//   { from, to }         → date range  (ISO strings)
//   { min, max }         → number range
type JsonFilterEntry =
  | string[]
  | { from: string; to: string }
  | { min: number; max: number };

type JsonFilters = Record<string, JsonFilterEntry>;

// ── Parser configurations for URL state ────────────────────────────────
const urlStateParsers = {
  // Bookmark
  bk: parseAsString.withDefault('system-all'),

  // Search
  search: parseAsString,

  // Sorting
  sortBy: parseAsString,
  sortDesc: parseAsBoolean.withDefault(true),

  // Grouping
  groupBy: parseAsString.withDefault('fixtureId'),

  // Pagination
  page: parseAsInteger.withDefault(0),
  pageSize: parseAsInteger.withDefault(25),

  // Individual high-frequency filters (short param names)
  status: parseAsArrayOf(parseAsString),
  vessels: parseAsArrayOf(parseAsString),
  owner: parseAsArrayOf(parseAsString),
  charterer: parseAsArrayOf(parseAsString),
  dateStart: parseAsIsoDateTime,
  dateEnd: parseAsIsoDateTime,

  // Catch-all for remaining ~60 grouped column filters
  f: parseAsJson<JsonFilters>((value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as JsonFilters;
    }
    return null;
  }),
};

// ── Public types ───────────────────────────────────────────────────────
export interface FixtureUrlState {
  bk: string;
  search: string | null;
  sortBy: string | null;
  sortDesc: boolean;
  groupBy: string;
  page: number;
  pageSize: number;
  status: string[] | null;
  vessels: string[] | null;
  owner: string[] | null;
  charterer: string[] | null;
  dateStart: Date | null;
  dateEnd: Date | null;
  f: JsonFilters | null;
}

export interface FixtureUrlActions {
  setSearch: (search: string | null) => void;
  setSort: (sortBy: string | null, desc: boolean) => void;
  setGroupBy: (groupBy: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setBookmark: (bk: string) => void;
  /** Atomically update all filter-related params + reset page to 0 */
  setFilters: (params: SerializedFilterParams) => void;
  /** Atomically set ALL url state (used by loadBookmark) */
  setAllUrlState: (params: Partial<FixtureUrlState>) => void;
  resetFilters: () => void;
  resetAll: () => void;
}

// ── Serialization helpers ──────────────────────────────────────────────

export interface SerializedFilterParams {
  status: string[] | null;
  vessels: string[] | null;
  owner: string[] | null;
  charterer: string[] | null;
  dateStart: Date | null;
  dateEnd: Date | null;
  f: JsonFilters | null;
}

/**
 * Convert the activeFilters Record<string, FilterValue> into URL-suitable params.
 * Splits well-known filters (status, vessels, owner, charterer, cpDate) into
 * individual params, and packs the rest into the JSON `f` param.
 */
export function serializeFiltersToUrl(activeFilters: Record<string, FilterValue>): SerializedFilterParams {
  const result: SerializedFilterParams = {
    status: null,
    vessels: null,
    owner: null,
    charterer: null,
    dateStart: null,
    dateEnd: null,
    f: null,
  };

  const remaining: JsonFilters = {};

  for (const [key, value] of Object.entries(activeFilters)) {
    if (value == null) continue;

    // Well-known individual filters
    if (key === 'status' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      result.status = value as string[];
      continue;
    }
    if (key === 'vessels' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      result.vessels = value as string[];
      continue;
    }
    if (key === 'owner' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      result.owner = value as string[];
      continue;
    }
    if (key === 'charterer' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      result.charterer = value as string[];
      continue;
    }
    if (key === 'cpDate') {
      if (Array.isArray(value) && value.length === 2 && value[0] instanceof Date) {
        result.dateStart = value[0] as Date;
        result.dateEnd = value[1] as Date;
      } else if (value instanceof Date) {
        result.dateStart = value;
        result.dateEnd = value;
      }
      continue;
    }

    // Remaining filters → JSON `f` param
    // String array (multiselect)
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      remaining[key] = value as string[];
      continue;
    }
    // Date range [Date, Date]
    if (Array.isArray(value) && value.length === 2 && value[0] instanceof Date) {
      remaining[key] = {
        from: (value[0] as Date).toISOString(),
        to: (value[1] as Date).toISOString(),
      };
      continue;
    }
    // Single date
    if (value instanceof Date) {
      remaining[key] = {
        from: value.toISOString(),
        to: value.toISOString(),
      };
      continue;
    }
    // Number range [number, number]
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      remaining[key] = {
        min: value[0] as number,
        max: value[1] as number,
      };
      continue;
    }
    // Single number (exact match)
    if (typeof value === 'number') {
      remaining[key] = { min: value, max: value };
      continue;
    }
  }

  result.f = Object.keys(remaining).length > 0 ? remaining : null;
  return result;
}

/**
 * Reconstruct Record<string, FilterValue> from URL params.
 * Individual params → their keys. JSON `f` entries → original types.
 */
export function deserializeFiltersFromUrl(urlState: FixtureUrlState): Record<string, FilterValue> {
  const filters: Record<string, FilterValue> = {};

  if (urlState.status && urlState.status.length > 0) {
    filters.status = urlState.status;
  }
  if (urlState.vessels && urlState.vessels.length > 0) {
    filters.vessels = urlState.vessels;
  }
  if (urlState.owner && urlState.owner.length > 0) {
    filters.owner = urlState.owner;
  }
  if (urlState.charterer && urlState.charterer.length > 0) {
    filters.charterer = urlState.charterer;
  }
  if (urlState.dateStart && urlState.dateEnd) {
    filters.cpDate = [urlState.dateStart, urlState.dateEnd];
  } else if (urlState.dateStart) {
    filters.cpDate = urlState.dateStart;
  }

  // Reconstruct from JSON `f` param
  if (urlState.f) {
    for (const [key, entry] of Object.entries(urlState.f)) {
      if (Array.isArray(entry)) {
        // string[] → multiselect
        filters[key] = entry;
      } else if ('from' in entry && 'to' in entry) {
        // { from, to } → [Date, Date]
        filters[key] = [new Date(entry.from), new Date(entry.to)];
      } else if ('min' in entry && 'max' in entry) {
        // { min, max } → [number, number]
        filters[key] = [entry.min, entry.max];
      }
    }
  }

  return filters;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useFixtureUrlState(): [FixtureUrlState, FixtureUrlActions] {
  const [urlState, setUrlState] = useQueryStates(urlStateParsers, {
    history: 'push',
  });

  // Memoize the state object to prevent unnecessary re-renders
  const state: FixtureUrlState = useMemo(() => ({
    bk: urlState.bk,
    search: urlState.search,
    sortBy: urlState.sortBy,
    sortDesc: urlState.sortDesc,
    groupBy: urlState.groupBy,
    page: urlState.page,
    pageSize: urlState.pageSize,
    status: urlState.status,
    vessels: urlState.vessels,
    owner: urlState.owner,
    charterer: urlState.charterer,
    dateStart: urlState.dateStart,
    dateEnd: urlState.dateEnd,
    f: urlState.f,
  }), [urlState]);

  // ── Actions ──────────────────────────────────────────────────────────

  const setSearch = useCallback((search: string | null) => {
    setUrlState({ search: search || null, page: 0 });
  }, [setUrlState]);

  const setSort = useCallback((sortBy: string | null, desc: boolean) => {
    setUrlState({ sortBy, sortDesc: desc });
  }, [setUrlState]);

  const setGroupBy = useCallback((groupBy: string) => {
    setUrlState({ groupBy, page: 0 });
  }, [setUrlState]);

  const setPage = useCallback((page: number) => {
    setUrlState({ page }, { history: 'replace' });
  }, [setUrlState]);

  const setPageSize = useCallback((pageSize: number) => {
    setUrlState({ pageSize, page: 0 }, { history: 'replace' });
  }, [setUrlState]);

  const setBookmark = useCallback((bk: string) => {
    setUrlState({ bk });
  }, [setUrlState]);

  const setFilters = useCallback((params: SerializedFilterParams) => {
    setUrlState({
      ...params,
      page: 0,
    });
  }, [setUrlState]);

  const setAllUrlState = useCallback((params: Partial<FixtureUrlState>) => {
    setUrlState(params);
  }, [setUrlState]);

  const resetFilters = useCallback(() => {
    setUrlState({
      status: null,
      vessels: null,
      owner: null,
      charterer: null,
      dateStart: null,
      dateEnd: null,
      f: null,
      search: null,
      page: 0,
    });
  }, [setUrlState]);

  const resetAll = useCallback(() => {
    setUrlState({
      bk: 'system-all',
      search: null,
      sortBy: null,
      sortDesc: true,
      groupBy: 'fixtureId',
      page: 0,
      pageSize: 25,
      status: null,
      vessels: null,
      owner: null,
      charterer: null,
      dateStart: null,
      dateEnd: null,
      f: null,
    });
  }, [setUrlState]);

  const actions: FixtureUrlActions = useMemo(() => ({
    setSearch,
    setSort,
    setGroupBy,
    setPage,
    setPageSize,
    setBookmark,
    setFilters,
    setAllUrlState,
    resetFilters,
    resetAll,
  }), [
    setSearch, setSort, setGroupBy, setPage, setPageSize,
    setBookmark, setFilters, setAllUrlState, resetFilters, resetAll,
  ]);

  return useMemo(() => [state, actions] as const, [state, actions]);
}
