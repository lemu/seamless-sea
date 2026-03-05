import { useState } from "react";
import { useQuery } from "convex/react";
import { Tag } from "@rafal.lemieszewski/tide-ui";
import { api } from "../../../convex/_generated/api";
import { BaseWidget } from "../widgets/BaseWidget";
import { IntelligenceDetailSidebar } from "./IntelligenceDetailSidebar";
import type { IntelligenceItem } from "./IntelligenceCard";
import type { WidgetProps } from "../widgets/BaseWidget";
import type { NewsTickerWidgetConfig } from "../../types/widgets";
import { formatRelativeTime } from "../../utils/dataUtils";

const SOURCE_DOMAINS: Record<string, string> = {
  "Reuters": "reuters.com",
  "Bloomberg": "bloomberg.com",
  "TradeWinds": "tradewindsnews.com",
  "Lloyd's List": "lloydslist.com",
  "Splash247": "splash247.com",
  "Platts": "spglobal.com",
  "Argus Media": "argusmedia.com",
  "Maritime Executive": "maritime-executive.com",
};

function SourceLogo({ name }: { name: string }) {
  const domain = SOURCE_DOMAINS[name];
  if (!domain) return null;
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      aria-hidden="true"
      className="h-3.5 w-3.5 flex-shrink-0 rounded-[2px]"
    />
  );
}

const IMPACT_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

function ImpactDot({ level }: { level?: string }) {
  const cls = level ? IMPACT_DOT[level] ?? "bg-gray-400" : "bg-gray-400";
  return <span className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${cls}`} />;
}

// ─── Ticker mode (h=1) ────────────────────────────────────────────────────────

function TickerMode({ items }: { items: IntelligenceItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <span className="text-body-sm text-[var(--color-text-tertiary)]">
          No intelligence items
        </span>
      </div>
    );
  }

  // Double the items so the animation loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Fade masks */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12"
        style={{
          background:
            "linear-gradient(to right, var(--color-surface-primary), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12"
        style={{
          background:
            "linear-gradient(to left, var(--color-surface-primary), transparent)",
        }}
      />

      <div
        className="ticker-track flex items-center gap-0"
        style={
          {
            width: "max-content",
            animation: "ticker-scroll 30s linear infinite",
          } as React.CSSProperties
        }
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.animationPlayState = "running";
        }}
      >
        {doubled.map((item, idx) => (
          <span
            key={`${item._id}-${idx}`}
            className="flex flex-col justify-center gap-1.5 border-r border-[var(--color-border-primary-subtle)] px-6 py-3"
            style={{ minWidth: 400, maxWidth: 720 }}
          >
            {/* Top line: logo · source · time */}
            <span className="flex items-center gap-1.5 whitespace-nowrap text-body-sm text-[var(--color-text-tertiary)]">
              {item.sourceName && <SourceLogo name={item.sourceName} />}
              {item.sourceName && <span>{item.sourceName}</span>}
              {item.sourceName && <span>·</span>}
              <span>{formatRelativeTime(item.publishedAt)}</span>
            </span>
            {/* Title line: impact dot + title */}
            <span className="flex items-start gap-2 text-body-strong-md text-[var(--color-text-primary)]">
              <ImpactDot level={item.impactLevel} />
              <span className="line-clamp-2">{item.title}</span>
            </span>
            {/* Blurb */}
            {item.summary && (
              <span className="line-clamp-4 text-body-md text-[var(--color-text-secondary)]">
                {item.summary}
              </span>
            )}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── List mode (h≥2) ─────────────────────────────────────────────────────────

function ListMode({
  items,
  onSelect,
}: {
  items: IntelligenceItem[];
  onSelect: (item: IntelligenceItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <span className="text-body-sm text-[var(--color-text-tertiary)]">
          No intelligence items
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {items.map((item) => (
        <button
          key={item._id}
          onClick={() => onSelect(item)}
          className="flex items-start gap-3 border-b border-[var(--color-border-primary-subtle)] px-4 py-3 text-left hover:bg-[var(--color-surface-secondary)] transition-colors"
        >
          <div className="mt-[3px] flex-shrink-0">
            <ImpactDot level={item.impactLevel} />
          </div>
          <div className="min-w-0 flex-1">
            {/* Title — 14px/500, primary */}
            <p className="text-body-medium-md text-[var(--color-text-primary)] line-clamp-2">
              {item.title}
            </p>
            {/* Metadata — 12px/400, secondary/tertiary */}
            <div className="mt-1 flex items-center gap-1.5">
              {item.sourceName && (
                <>
                  <SourceLogo name={item.sourceName} />
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    {item.sourceName}
                  </span>
                  <span className="text-body-sm text-[var(--color-text-tertiary)]">·</span>
                </>
              )}
              <span className="text-body-sm text-[var(--color-text-tertiary)]">
                {formatRelativeTime(item.publishedAt)}
              </span>
            </div>
            {/* Signal tags — tide-ui Tag, visually de-emphasised below metadata */}
            {item.keySignals && item.keySignals.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.keySignals.slice(0, 3).map((signal) => (
                  <Tag key={signal} size="s" variant="squared">
                    {signal}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewsTickerWidget({
  config,
  rows,
  isEditable,
  onDelete,
  onDuplicate,
  onResize,
  sizeConfigs,
}: WidgetProps) {
  const tickerConfig = config as unknown as NewsTickerWidgetConfig;
  const filters = tickerConfig.filters ?? {};

  const items = useQuery(api.news.list, {
    impactLevel: filters.impactLevel,
    category: filters.category || undefined,
    vesselType: filters.vesselType || undefined,
    region: filters.region || undefined,
    limit: tickerConfig.limit ?? 20,
  }) as IntelligenceItem[] | undefined;

  const [selectedItem, setSelectedItem] = useState<IntelligenceItem | null>(null);

  const isTickerMode = rows === 1;

  return (
    <>
      <BaseWidget
        title={config.title}
        rows={rows}
        isEditable={isEditable}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onResize={onResize}
        loading={items === undefined}
        sizeConfigs={sizeConfigs}
      >
        {items !== undefined && (
          isTickerMode ? (
            <TickerMode items={items} />
          ) : (
            <ListMode items={items} onSelect={setSelectedItem} />
          )
        )}
      </BaseWidget>

      <IntelligenceDetailSidebar
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
