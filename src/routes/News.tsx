import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Badge, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger } from "@rafal.lemieszewski/tide-ui";
import { Bell, X, ArrowUpDown, Pin } from "lucide-react";
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
    <div className="flex items-center gap-3 bg-red-600 rounded-lg px-4 py-3">
      <Bell size={16} className="text-white flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-body-strong-sm text-white">
          {count} High Impact Alert{count !== 1 ? "s" : ""}
        </span>
        <span className="text-body-sm text-white ml-2 opacity-80">
          Review the items marked High below — they may require immediate action.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-white opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
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
    <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger size="s" className="min-w-[140px]">
        <SelectValue placeholder={`All ${label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All {label}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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
          <h1 className="text-heading-sm text-[var(--color-text-primary)]">
            Maritime Intelligence
          </h1>
          <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
            Real-time operational intelligence for maritime professionals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highImpactCount != null && highImpactCount > 0 && (
            <Badge intent="destructive" size="s" icon={<Bell />}>
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
      <div className="flex items-center justify-between gap-3">
        {/* Selects group — no wrapping */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto min-w-0">
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
          <Select value={impactLevel || "__all__"} onValueChange={(v) => setFilter("impact", v === "__all__" ? "" : v)}>
            <SelectTrigger size="s" className="min-w-[140px]">
              <SelectValue placeholder="All Impact Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Impact Levels</SelectItem>
              {IMPACT_LEVELS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="s" onClick={clearFilters} className="flex-shrink-0">
              <X size={12} className="mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Sort toggle — fixed right */}
        <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)} className="flex-shrink-0">
          <TabsList variant="pilled" size="s">
            <TabsTrigger value="impact" variant="pilled" size="s">
              <ArrowUpDown size={12} />
              By Impact
            </TabsTrigger>
            <TabsTrigger value="chronological" variant="pilled" size="s">
              Latest first
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
