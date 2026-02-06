import { useQueryStates, parseAsArrayOf, parseAsString, parseAsInteger, parseAsIsoDateTime } from 'nuqs';
import { useMemo, useCallback } from 'react';

// Parser configurations for URL state
const urlStateParsers = {
  // Server pagination
  page: parseAsInteger.withDefault(0),
  pageSize: parseAsInteger.withDefault(25),
  cursor: parseAsString,

  // Filters
  status: parseAsArrayOf(parseAsString),
  vessels: parseAsArrayOf(parseAsString),
  owner: parseAsArrayOf(parseAsString),
  charterer: parseAsArrayOf(parseAsString),
  dateStart: parseAsIsoDateTime,
  dateEnd: parseAsIsoDateTime,

  // Search
  search: parseAsString,

  // Table state
  sortBy: parseAsString,
  sortDesc: parseAsString.withDefault('true'),
  groupBy: parseAsString.withDefault('fixtureId'),

  // Bookmark
  bookmark: parseAsString.withDefault('system-all'),
};

export interface FixtureUrlState {
  // Pagination
  page: number;
  pageSize: number;
  cursor: string | null;

  // Filters
  status: string[] | null;
  vessels: string[] | null;
  owner: string[] | null;
  charterer: string[] | null;
  dateStart: Date | null;
  dateEnd: Date | null;

  // Search
  search: string | null;

  // Table state
  sortBy: string | null;
  sortDesc: string;
  groupBy: string;

  // Bookmark
  bookmark: string;
}

export interface FixtureUrlStateActions {
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setCursor: (cursor: string | null) => void;

  setStatus: (status: string[] | null) => void;
  setVessels: (vessels: string[] | null) => void;
  setOwner: (owner: string[] | null) => void;
  setCharterer: (charterer: string[] | null) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;

  setSearch: (search: string | null) => void;

  setSort: (sortBy: string | null, desc: boolean) => void;
  setGroupBy: (groupBy: string) => void;

  setBookmark: (bookmark: string) => void;

  resetFilters: () => void;
  resetAll: () => void;
}

export function useFixtureUrlState(): [FixtureUrlState, FixtureUrlStateActions] {
  const [urlState, setUrlState] = useQueryStates(urlStateParsers, {
    history: 'push',
  });

  // Memoize the state object
  const state: FixtureUrlState = useMemo(() => ({
    page: urlState.page,
    pageSize: urlState.pageSize,
    cursor: urlState.cursor,
    status: urlState.status,
    vessels: urlState.vessels,
    owner: urlState.owner,
    charterer: urlState.charterer,
    dateStart: urlState.dateStart,
    dateEnd: urlState.dateEnd,
    search: urlState.search,
    sortBy: urlState.sortBy,
    sortDesc: urlState.sortDesc,
    groupBy: urlState.groupBy,
    bookmark: urlState.bookmark,
  }), [urlState]);

  // Actions
  const setPage = useCallback((page: number) => {
    setUrlState({ page });
  }, [setUrlState]);

  const setPageSize = useCallback((pageSize: number) => {
    setUrlState({ pageSize, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setCursor = useCallback((cursor: string | null) => {
    setUrlState({ cursor });
  }, [setUrlState]);

  const setStatus = useCallback((status: string[] | null) => {
    setUrlState({ status, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setVessels = useCallback((vessels: string[] | null) => {
    setUrlState({ vessels, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setOwner = useCallback((owner: string[] | null) => {
    setUrlState({ owner, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setCharterer = useCallback((charterer: string[] | null) => {
    setUrlState({ charterer, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setDateRange = useCallback((start: Date | null, end: Date | null) => {
    setUrlState({ dateStart: start, dateEnd: end, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setSearch = useCallback((search: string | null) => {
    setUrlState({ search: search || null, page: 0, cursor: null }); // Reset pagination
  }, [setUrlState]);

  const setSort = useCallback((sortBy: string | null, desc: boolean) => {
    setUrlState({ sortBy, sortDesc: desc ? 'true' : 'false' });
  }, [setUrlState]);

  const setGroupBy = useCallback((groupBy: string) => {
    setUrlState({ groupBy });
  }, [setUrlState]);

  const setBookmark = useCallback((bookmark: string) => {
    setUrlState({ bookmark });
  }, [setUrlState]);

  const resetFilters = useCallback(() => {
    setUrlState({
      status: null,
      vessels: null,
      owner: null,
      charterer: null,
      dateStart: null,
      dateEnd: null,
      search: null,
      page: 0,
      cursor: null,
    });
  }, [setUrlState]);

  const resetAll = useCallback(() => {
    setUrlState({
      page: 0,
      pageSize: 25,
      cursor: null,
      status: null,
      vessels: null,
      owner: null,
      charterer: null,
      dateStart: null,
      dateEnd: null,
      search: null,
      sortBy: null,
      sortDesc: 'true',
      groupBy: 'fixtureId',
      bookmark: 'system-all',
    });
  }, [setUrlState]);

  const actions: FixtureUrlStateActions = useMemo(() => ({
    setPage,
    setPageSize,
    setCursor,
    setStatus,
    setVessels,
    setOwner,
    setCharterer,
    setDateRange,
    setSearch,
    setSort,
    setGroupBy,
    setBookmark,
    resetFilters,
    resetAll,
  }), [
    setPage, setPageSize, setCursor, setStatus, setVessels, setOwner,
    setCharterer, setDateRange, setSearch, setSort, setGroupBy, setBookmark,
    resetFilters, resetAll
  ]);

  return [state, actions];
}
