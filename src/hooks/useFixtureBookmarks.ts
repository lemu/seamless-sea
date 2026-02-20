import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Bookmark, FilterValue } from "@rafal.lemieszewski/tide-ui";
import { toast } from "@rafal.lemieszewski/tide-ui";
import { useUser } from "./useUser";
import type { FixtureUrlActions } from "./useFixtureUrlState";
import { serializeFiltersToUrl } from "./useFixtureUrlState";
import type { VisibilityState, SortingState, GroupingState, ColumnOrderState } from "@tanstack/react-table";

// ── Types ─────────────────────────────────────────────────────────────

interface BookmarkCounts {
  totalFixtures: number;
  totalNegotiations: number;
  totalContracts: number;
}

interface BookmarkCurrentState {
  activeFilters: Record<string, FilterValue>;
  globalSearchTerms: string[];
  pinnedFilters: string[];
  sorting: SortingState;
  columnVisibility: VisibilityState;
  grouping: GroupingState;
  columnOrder: ColumnOrderState;
  columnSizing: Record<string, number>;
}

interface LoadBookmarkCallbacks {
  setPinnedFilters: (filters: string[]) => void;
  setColumnVisibility: (vis: VisibilityState) => void;
  setColumnOrder: (order: ColumnOrderState) => void;
  setColumnSizing: (sizing: Record<string, number>) => void;
  setIsBookmarkLoading: (loading: boolean) => void;
  resetCursor: () => void;
  enforceMinColumnSizing: (sizing: Record<string, number>) => Record<string, number>;
}

export interface UseFixtureBookmarksOptions {
  organizationId: Id<"organizations"> | undefined;
  urlActions: FixtureUrlActions;
  activeBookmarkId: string;
  defaultHiddenColumns: VisibilityState;
  currentState: BookmarkCurrentState;
  globalPinnedFilters: string[];
  serverGroupCount: number | undefined;
  serverTotalCount: number;
  isQueryLoading: boolean;
  callbacks: LoadBookmarkCallbacks;
  bookmarkLoadingTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

export interface UseFixtureBookmarksReturn {
  bookmarks: Bookmark[];
  systemBookmarks: Bookmark[];
  systemBookmarksWithCounts: (Bookmark & { isLoadingCount?: boolean })[];
  bookmarksWithCounts: (Bookmark & { isLoadingCount?: boolean })[];
  activeBookmark: (Bookmark & { isLoadingCount?: boolean }) | undefined;
  isDirty: boolean;
  handleBookmarkSelect: (bookmark: Bookmark) => void;
  handleRevert: () => void;
  handleSave: (action: "update" | "create", name?: string) => Promise<void>;
  handleRename: (id: string, newName: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleSetDefault: (id: string) => Promise<void>;
  loadBookmark: (bookmark: Bookmark, showLoading?: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────

const convertDbBookmark = (
  dbBookmark: Omit<Bookmark, "createdAt" | "updatedAt"> & {
    createdAt: number;
    updatedAt: number;
    id: string;
  }
): Bookmark => ({
  ...dbBookmark,
  id: dbBookmark.id as string,
  createdAt: new Date(dbBookmark.createdAt),
  updatedAt: new Date(dbBookmark.updatedAt),
});

/**
 * Deep equality comparison for bookmark state.
 * Handles objects, arrays, and primitives with order-insensitive object comparison.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA).sort();
    const keysB = Object.keys(objB).sort();
    if (keysA.length !== keysB.length) return false;
    if (!keysA.every((key, idx) => key === keysB[idx])) return false;
    return keysA.every((key) => deepEqual(objA[key], objB[key]));
  }

  return false;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useFixtureBookmarks(
  opts: UseFixtureBookmarksOptions
): UseFixtureBookmarksReturn {
  const {
    organizationId,
    urlActions,
    activeBookmarkId,
    defaultHiddenColumns,
    currentState,
    globalPinnedFilters,
    serverGroupCount,
    serverTotalCount,
    isQueryLoading,
    callbacks,
    bookmarkLoadingTimerRef,
  } = opts;

  // Get current user
  const { user } = useUser();
  const userId = user?.appUserId;

  // Query bookmark counts
  const bookmarkCounts = useQuery(
    api.fixtures.getBookmarkCounts,
    organizationId ? { organizationId } : "skip"
  ) as BookmarkCounts | undefined;

  // Query bookmarks from Convex
  const userBookmarksFromDb = useQuery(
    api.user_bookmarks.getUserBookmarks,
    userId ? { userId } : "skip"
  );

  // Mutation hooks
  const createBookmarkMutation = useMutation(api.user_bookmarks.createBookmark);
  const updateBookmarkMutation = useMutation(api.user_bookmarks.updateBookmark);
  const renameBookmarkMutation = useMutation(api.user_bookmarks.renameBookmark);
  const deleteBookmarkMutation = useMutation(api.user_bookmarks.deleteBookmark);
  const setDefaultBookmarkMutation = useMutation(api.user_bookmarks.setDefaultBookmark);

  // Local state for optimistic updates
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Sync from database when loaded
  useEffect(() => {
    if (userBookmarksFromDb) {
      setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
    }
  }, [userBookmarksFromDb, userId]);

  // System bookmarks
  const systemBookmarks: Bookmark[] = useMemo(
    () => [
      {
        id: "system-all",
        name: "All Fixtures",
        type: "system",
        isDefault: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        count: bookmarkCounts?.totalFixtures ?? 0,
        filtersState: {
          activeFilters: {},
          pinnedFilters: [],
          globalSearchTerms: [],
        },
        tableState: {
          sorting: [{ id: "lastUpdated", desc: true }],
          columnVisibility: defaultHiddenColumns,
          grouping: ["fixtureId"],
          columnOrder: [],
          columnSizing: {},
        },
      },
      {
        id: "system-negotiations",
        name: "Negotiations",
        type: "system",
        isDefault: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        count: bookmarkCounts?.totalNegotiations ?? 0,
        filtersState: {
          activeFilters: {},
          pinnedFilters: [],
          globalSearchTerms: [],
        },
        tableState: {
          sorting: [{ id: "lastUpdated", desc: true }],
          columnVisibility: defaultHiddenColumns,
          grouping: ["negotiationId"],
          columnOrder: [],
          columnSizing: {},
        },
      },
      {
        id: "system-contracts",
        name: "Contracts",
        type: "system",
        isDefault: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        count: bookmarkCounts?.totalContracts ?? 0,
        filtersState: {
          activeFilters: {},
          pinnedFilters: [],
          globalSearchTerms: [],
        },
        tableState: {
          sorting: [{ id: "lastUpdated", desc: true }],
          columnVisibility: defaultHiddenColumns,
          grouping: ["cpId"],
          columnOrder: [],
          columnSizing: {},
        },
      },
    ],
    [bookmarkCounts, defaultHiddenColumns]
  );

  // System bookmarks with loading state
  const systemBookmarksWithCounts = useMemo(
    () =>
      systemBookmarks.map((bookmark) => ({
        ...bookmark,
        isLoadingCount: bookmarkCounts === undefined,
      })),
    [systemBookmarks, bookmarkCounts]
  );

  // User bookmarks with live counts
  const serverDisplayCount = serverGroupCount ?? serverTotalCount;
  const bookmarksWithCounts = useMemo(
    () =>
      bookmarks.map((bookmark) => {
        const isActive = bookmark.id === activeBookmarkId;
        return {
          ...bookmark,
          count: isActive && !isQueryLoading ? serverDisplayCount : bookmark.count,
          isLoadingCount: isActive && isQueryLoading && bookmark.count == null,
        };
      }),
    [bookmarks, activeBookmarkId, serverDisplayCount, isQueryLoading]
  );

  // Sync live count to local state + DB when viewing a user bookmark
  // so that switching away shows the correct count, not stale data
  useEffect(() => {
    if (isQueryLoading || !activeBookmarkId) return;

    const displayCount = serverGroupCount ?? serverTotalCount;
    const bookmark = bookmarks.find((b) => b.id === activeBookmarkId);

    // Only for user bookmarks, only if count actually changed
    if (!bookmark || bookmark.count === displayCount) return;

    // Update local state immediately
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === activeBookmarkId ? { ...b, count: displayCount } : b
      )
    );

    // Persist to DB (fire-and-forget)
    updateBookmarkMutation({
      bookmarkId: activeBookmarkId as Id<"user_bookmarks">,
      count: displayCount,
    }).catch(() => {
      // Silently ignore — local state is already correct for this session
    });
  }, [activeBookmarkId, serverGroupCount, serverTotalCount, isQueryLoading, bookmarks, updateBookmarkMutation]);

  // Active bookmark
  const activeBookmark = useMemo(
    () =>
      [...systemBookmarksWithCounts, ...bookmarksWithCounts].find(
        (b) => b.id === activeBookmarkId
      ),
    [systemBookmarksWithCounts, bookmarksWithCounts, activeBookmarkId]
  );

  // isDirty check
  const isDirty = useMemo(() => {
    if (!activeBookmark) return false;

    const savedFiltersState = activeBookmark.filtersState || {
      activeFilters: {},
      globalSearchTerms: [],
      pinnedFilters: [],
    };

    const savedTableState = activeBookmark.tableState || {
      sorting: [],
      columnVisibility: {},
      grouping: [],
      columnOrder: [],
      columnSizing: {},
    };

    const currentFiltersState = {
      activeFilters: currentState.activeFilters,
      globalSearchTerms: currentState.globalSearchTerms,
      ...(activeBookmark.type === "user" && {
        pinnedFilters: currentState.pinnedFilters,
      }),
    };

    const savedFiltersToCompare = {
      activeFilters: savedFiltersState.activeFilters,
      globalSearchTerms: savedFiltersState.globalSearchTerms,
      ...(activeBookmark.type === "user" && {
        pinnedFilters: savedFiltersState.pinnedFilters,
      }),
    };

    const filtersMatch = deepEqual(currentFiltersState, savedFiltersToCompare);

    const currentTableState = {
      sorting: currentState.sorting,
      columnVisibility: currentState.columnVisibility,
      grouping: currentState.grouping,
      columnOrder: currentState.columnOrder,
      columnSizing: currentState.columnSizing,
    };

    const tableMatch = deepEqual(currentTableState, savedTableState);

    return !filtersMatch || !tableMatch;
  }, [activeBookmark, currentState]);

  // ── Actions ───────────────────────────────────────────────────────────

  const loadBookmark = useCallback(
    (bookmark: Bookmark, showLoading = true) => {
      if (showLoading) {
        clearTimeout(bookmarkLoadingTimerRef.current);
        callbacks.setIsBookmarkLoading(true);
        bookmarkLoadingTimerRef.current = setTimeout(() => {
          callbacks.setIsBookmarkLoading(false);
        }, 300);
      }

      callbacks.resetCursor();

      const bookmarkFilters = bookmark.filtersState?.activeFilters ?? {};
      const bookmarkSearch = bookmark.filtersState?.globalSearchTerms ?? [];
      const bookmarkSorting = bookmark.tableState?.sorting ?? [];
      const bookmarkGrouping = bookmark.tableState?.grouping ?? [];
      const filterParams = serializeFiltersToUrl(bookmarkFilters);

      urlActions.setAllUrlState({
        ...filterParams,
        search: bookmarkSearch.join(" ") || null,
        sortBy: bookmarkSorting[0]?.id ?? null,
        sortDesc: bookmarkSorting[0]?.desc ?? true,
        groupBy: bookmarkGrouping[0] ?? "fixtureId",
        bk: bookmark.id,
        page: 0,
      });

      if (bookmark.filtersState) {
        if (bookmark.type === "user") {
          callbacks.setPinnedFilters(bookmark.filtersState.pinnedFilters);
        } else {
          callbacks.setPinnedFilters(globalPinnedFilters);
        }
      } else {
        if (bookmark.type === "system") {
          callbacks.setPinnedFilters(globalPinnedFilters);
        }
      }

      if (bookmark.tableState) {
        callbacks.setColumnVisibility(bookmark.tableState.columnVisibility);
        callbacks.setColumnOrder(bookmark.tableState.columnOrder || []);
        callbacks.setColumnSizing(
          callbacks.enforceMinColumnSizing(bookmark.tableState.columnSizing)
        );
      } else {
        callbacks.setColumnVisibility({});
        callbacks.setColumnOrder([]);
        callbacks.setColumnSizing({});
      }
    },
    [urlActions, globalPinnedFilters, callbacks, bookmarkLoadingTimerRef]
  );

  const handleBookmarkSelect = useCallback(
    (bookmark: Bookmark) => {
      if (bookmark.id === activeBookmarkId) return;
      loadBookmark(bookmark);
    },
    [activeBookmarkId, loadBookmark]
  );

  const handleRevert = useCallback(() => {
    if (activeBookmark) {
      const bookmarkFilters = activeBookmark.filtersState?.activeFilters ?? {};
      const bookmarkSearch =
        activeBookmark.filtersState?.globalSearchTerms ?? [];
      const bookmarkSorting = activeBookmark.tableState?.sorting ?? [];
      const bookmarkGrouping = activeBookmark.tableState?.grouping ?? [];
      const filterParams = serializeFiltersToUrl(bookmarkFilters);

      urlActions.setAllUrlState({
        ...filterParams,
        search: bookmarkSearch.join(" ") || null,
        sortBy: bookmarkSorting[0]?.id ?? null,
        sortDesc: bookmarkSorting[0]?.desc ?? true,
        groupBy: bookmarkGrouping[0] ?? "fixtureId",
        page: 0,
      });

      if (activeBookmark.filtersState) {
        if (activeBookmark.type === "user") {
          callbacks.setPinnedFilters(activeBookmark.filtersState.pinnedFilters);
        }
      }

      if (activeBookmark.tableState) {
        callbacks.setColumnVisibility(activeBookmark.tableState.columnVisibility);
        callbacks.setColumnOrder(activeBookmark.tableState.columnOrder || []);
        callbacks.setColumnSizing(activeBookmark.tableState.columnSizing);
      } else {
        callbacks.setColumnVisibility({});
        callbacks.setColumnOrder([]);
        callbacks.setColumnSizing({});
      }
    }
  }, [activeBookmark, urlActions, callbacks]);

  const handleSave = useCallback(
    async (action: "update" | "create", name?: string) => {
      if (!userId) return;

      const bookmarkData = {
        filtersState: {
          activeFilters: currentState.activeFilters,
          pinnedFilters: currentState.pinnedFilters,
          globalSearchTerms: currentState.globalSearchTerms,
        },
        tableState: {
          sorting: currentState.sorting,
          columnVisibility: currentState.columnVisibility,
          grouping: currentState.grouping,
          columnOrder: currentState.columnOrder,
          columnSizing: currentState.columnSizing,
        },
        count: serverGroupCount ?? serverTotalCount,
      };

      try {
        if (action === "create") {
          const tempId = `temp-${Date.now()}`;
          const now = new Date();
          const optimisticBookmark: Bookmark = {
            id: tempId,
            name: name || "New Bookmark",
            type: "user",
            createdAt: now,
            updatedAt: now,
            count: serverGroupCount ?? serverTotalCount,
            filtersState: bookmarkData.filtersState,
            tableState: bookmarkData.tableState,
          };

          setBookmarks((prev) => [...prev, optimisticBookmark]);
          urlActions.setBookmark(tempId);

          const newBookmark = await createBookmarkMutation({
            userId,
            name: name || "New Bookmark",
            ...bookmarkData,
          });
          setBookmarks((prev) =>
            prev.map((b) =>
              b.id === tempId ? convertDbBookmark(newBookmark) : b
            )
          );
          urlActions.setBookmark(newBookmark.id);
        } else {
          const bookmarkId = activeBookmarkId as Id<"user_bookmarks">;

          setBookmarks((prev) =>
            prev.map((b) =>
              b.id === bookmarkId
                ? { ...b, ...bookmarkData, updatedAt: new Date() }
                : b
            )
          );

          await updateBookmarkMutation({
            bookmarkId,
            ...bookmarkData,
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to save bookmark:", error);
        toast.error("Failed to save bookmark");
        if (userBookmarksFromDb) {
          setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
        }
      }
    },
    [
      userId,
      currentState,
      serverGroupCount,
      serverTotalCount,
      activeBookmarkId,
      urlActions,
      createBookmarkMutation,
      updateBookmarkMutation,
      userBookmarksFromDb,
    ]
  );

  const handleRename = useCallback(
    async (id: string, newName: string) => {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: newName } : b))
      );

      try {
        await renameBookmarkMutation({
          bookmarkId: id as Id<"user_bookmarks">,
          newName,
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to rename bookmark:", error);
        toast.error("Failed to rename bookmark");
        if (userBookmarksFromDb) {
          setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
        }
      }
    },
    [renameBookmarkMutation, userBookmarksFromDb]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const previousBookmarks = bookmarks;
      setBookmarks((prev) => prev.filter((b) => b.id !== id));

      if (activeBookmarkId === id) {
        const firstAvailable =
          systemBookmarksWithCounts[0] ||
          bookmarksWithCounts.find((b) => b.id !== id);
        if (firstAvailable) {
          loadBookmark(firstAvailable);
        }
      }

      try {
        await deleteBookmarkMutation({
          bookmarkId: id as Id<"user_bookmarks">,
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to delete bookmark:", error);
        toast.error("Failed to delete bookmark");
        setBookmarks(previousBookmarks);
      }
    },
    [
      bookmarks,
      activeBookmarkId,
      systemBookmarksWithCounts,
      bookmarksWithCounts,
      loadBookmark,
      deleteBookmarkMutation,
    ]
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      if (!userId) return;

      setBookmarks((prev) =>
        prev.map((b) => ({
          ...b,
          isDefault: b.id === id,
        }))
      );

      try {
        await setDefaultBookmarkMutation({
          userId,
          bookmarkId: id as Id<"user_bookmarks">,
        });
      } catch (error) {
        if (import.meta.env.DEV)
          console.error("Failed to set default bookmark:", error);
        toast.error("Failed to set default bookmark");
        if (userBookmarksFromDb) {
          setBookmarks(userBookmarksFromDb.map(convertDbBookmark));
        }
      }
    },
    [userId, setDefaultBookmarkMutation, userBookmarksFromDb]
  );

  return {
    bookmarks,
    systemBookmarks,
    systemBookmarksWithCounts,
    bookmarksWithCounts,
    activeBookmark,
    isDirty,
    handleBookmarkSelect,
    handleRevert,
    handleSave,
    handleRename,
    handleDelete,
    handleSetDefault,
    loadBookmark,
  };
}
