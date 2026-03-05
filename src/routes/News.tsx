import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Badge, Skeleton } from "@rafal.lemieszewski/tide-ui";
import { Bell, X, SlidersHorizontal, ArrowUpDown, Pin } from "lucide-react";
import { IntelligenceCard } from "../components/news/IntelligenceCard";
import { IntelligenceDetailSidebar } from "../components/news/IntelligenceDetailSidebar";
import { PinNewsToBoardModal } from "../components/news/PinNewsToBoardModal";
import { NEWS_CATEGORIES, VESSEL_TYPES, NEWS_REGIONS } from "../types/news";
import type { ImpactLevel } from "../types/news";
import type { IntelligenceItem } from "../components/news/IntelligenceCard";

const IMPACT_LEVELS: { value: ImpactLevel; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

type SortMode = "impact" | "chronological";

function CardSkeleton() {
  return (
    <div className="border border-[var(--color-border-subtle,#e5e7eb)] border-l-4 border-l-gray-200 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="w-10 h-4 rounded" />
        <Skeleton className="w-24 h-4 rounded" />
        <Skeleton className="w-16 h-4 rounded" />
      </div>
      <Skeleton className="w-4/5 h-5 rounded" />
      <Skeleton className="w-2/5 h-3 rounded" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-5 rounded" />
        <Skeleton className="w-24 h-5 rounded" />
        <Skeleton className="w-16 h-5 rounded" />
      </div>
    </div>
  );
}

function AlertBanner({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <Bell size={16} className="text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-body-sm font-semibold text-red-700">
          {count} High Impact Alert{count !== 1 ? "s" : ""}
        </span>
        <span className="text-body-sm text-red-600 ml-2">
          Review the items marked High below — they may require immediate action.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
        aria-label="Dismiss alert banner"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-body-sm text-[var(--color-text-primary)] bg-[var(--color-bg-default,#fff)] border border-[var(--color-border-default,#d1d5db)] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus,#005f85)] appearance-none cursor-pointer"
      aria-label={label}
    >
      <option value="">All {label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [limit, setLimit] = useState(10);
  const [selectedItem, setSelectedItem] = useState<IntelligenceItem | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("impact");
  const [showPinModal, setShowPinModal] = useState(false);

  const impactLevel = (searchParams.get("impact") as ImpactLevel | null) ?? "";
  const category = searchParams.get("category") ?? "";
  const vesselType = searchParams.get("vessel") ?? "";
  const region = searchParams.get("region") ?? "";

  const hasFilters = Boolean(impactLevel || category || vesselType || region);

  function setFilter(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  // Fetch all matching items (sorting is done client-side so we can switch modes)
  const rawItems = useQuery(api.news.list, {
    impactLevel: impactLevel || undefined,
    category: category || undefined,
    vesselType: vesselType || undefined,
    region: region || undefined,
    limit,
  });

  const highImpactCount = useQuery(api.news.getHighImpactCount, {});
  const seedCards = useMutation(api.news.seedIntelligenceCards);

  const isLoading = rawItems === undefined;

  // Apply client-side sort based on current mode
  const items: IntelligenceItem[] | undefined = rawItems
    ? [...(rawItems as IntelligenceItem[])].sort((a, b) => {
        if (sortMode === "chronological") {
          return b.publishedAt - a.publishedAt;
        }
        // impact mode: high → medium → low, then newest first
        const aOrder = IMPACT_ORDER[a.impactLevel ?? "low"] ?? 2;
        const bOrder = IMPACT_ORDER[b.impactLevel ?? "low"] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.publishedAt - a.publishedAt;
      })
    : undefined;

  const showAlertBanner =
    !alertDismissed &&
    !hasFilters &&
    highImpactCount != null &&
    highImpactCount > 0;

  const canLoadMore = !isLoading && rawItems!.length === limit;

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-md text-[var(--color-text-primary)]">
            Maritime Intelligence
          </h1>
          <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
            Real-time operational intelligence for maritime professionals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highImpactCount != null && highImpactCount > 0 && (
            <Badge intent="destructive" size="s">
              <Bell size={12} className="mr-1" />
              {highImpactCount} High Alert{highImpactCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="secondary" size="s" onClick={() => setShowPinModal(true)}>
            <Pin size={13} className="mr-1.5" />
            Pin to board
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      {showAlertBanner && (
        <AlertBanner
          count={highImpactCount!}
          onDismiss={() => setAlertDismissed(true)}
        />
      )}

      {/* Filter bar + sort toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <SlidersHorizontal size={16} className="text-[var(--color-text-tertiary)] flex-shrink-0" />

        <FilterSelect
          label="Regions"
          value={region}
          options={NEWS_REGIONS}
          onChange={(v) => setFilter("region", v)}
        />
        <FilterSelect
          label="Vessel Types"
          value={vesselType}
          options={VESSEL_TYPES}
          onChange={(v) => setFilter("vessel", v)}
        />
        <FilterSelect
          label="Categories"
          value={category}
          options={NEWS_CATEGORIES}
          onChange={(v) => setFilter("category", v)}
        />
        <select
          value={impactLevel}
          onChange={(e) => setFilter("impact", e.target.value)}
          className="text-body-sm text-[var(--color-text-primary)] bg-[var(--color-bg-default,#fff)] border border-[var(--color-border-default,#d1d5db)] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus,#005f85)] appearance-none cursor-pointer"
          aria-label="Impact Level"
        >
          <option value="">All Impact Levels</option>
          {IMPACT_LEVELS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="s" onClick={clearFilters}>
            <X size={12} className="mr-1" />
            Clear filters
          </Button>
        )}

        {/* Sort toggle — pushed to the right */}
        <div className="ml-auto flex items-center gap-1 bg-[var(--color-bg-neutral-subtle,#f5f5f5)] rounded-md p-0.5">
          <button
            onClick={() => setSortMode("impact")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-body-xs rounded transition-colors ${
              sortMode === "impact"
                ? "bg-white text-[var(--color-text-primary)] shadow-sm font-medium"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            aria-pressed={sortMode === "impact"}
          >
            <ArrowUpDown size={12} />
            By Impact
          </button>
          <button
            onClick={() => setSortMode("chronological")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-body-xs rounded transition-colors ${
              sortMode === "chronological"
                ? "bg-white text-[var(--color-text-primary)] shadow-sm font-medium"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            aria-pressed={sortMode === "chronological"}
          >
            Latest first
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : items!.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onSeed={() => seedCards({})} />
        ) : (
          items!.map((item) => (
            <IntelligenceCard key={String(item._id)} item={item} onSelect={setSelectedItem} />
          ))
        )}
      </div>

      {/* Load more */}
      {canLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={() => setLimit((l) => l + 10)}>
            Load more intelligence ↓
          </Button>
        </div>
      )}

      {/* Detail sidebar */}
      <IntelligenceDetailSidebar
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Pin to board modal */}
      {showPinModal && (
        <PinNewsToBoardModal
          filters={{ region, category, vesselType, impactLevel }}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onSeed,
}: {
  hasFilters: boolean;
  onSeed: () => void;
}) {
  return (
    <div className="py-16 flex flex-col items-center gap-4 text-center">
      <p className="text-heading-sm text-[var(--color-text-primary)]">
        {hasFilters ? "No items match your filters" : "No intelligence cards yet"}
      </p>
      <p className="text-body-sm text-[var(--color-text-secondary)] max-w-sm">
        {hasFilters
          ? "Try broadening your filters to see more results."
          : "Seed the feed with example intelligence cards to get started."}
      </p>
      {!hasFilters && (
        <Button variant="secondary" onClick={onSeed}>
          Load example intelligence
        </Button>
      )}
    </div>
  );
}
