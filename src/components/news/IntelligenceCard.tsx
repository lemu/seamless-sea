import { Card, CardContent, Badge, Button, Tag } from "@rafal.lemieszewski/tide-ui";
import { Search, ArrowRight } from "lucide-react";
import type { ImpactLevel } from "../../types/news";
import { formatRelativeTime } from "../../utils/dataUtils";

export interface IntelligenceItem {
  _id: string;
  title: string;
  summary?: string;
  publishedAt: number;
  impactLevel?: ImpactLevel;
  sourceName?: string;
  shippingInsight?: string;
  marketImpact?: string;
  contractRisk?: string;
  recommendedAction?: string;
  vesselTypes?: string[];
  regions?: string[];
  categoryTags?: string[];
  keySignals?: string[];
  isAiGenerated?: boolean;
}

interface IntelligenceCardProps {
  item: IntelligenceItem;
  onSelect: (item: IntelligenceItem) => void;
}

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; dot: string; border: string; textColor: string }> = {
  high: {
    label: "High",
    dot: "bg-red-500",
    border: "border-l-red-500",
    textColor: "#dc2626",
  },
  medium: {
    label: "Med",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
    textColor: "#d97706",
  },
  low: {
    label: "Low",
    dot: "bg-green-500",
    border: "border-l-green-500",
    textColor: "#16a34a",
  },
};

const CATEGORY_INTENT: Record<string, "destructive" | "warning" | "information" | "neutral" | "success"> = {
  "Geopolitics & Security": "destructive",
  "Trade Flows & Commodity Markets": "information",
  "Freight Market Movements": "information",
  "Port & Canal Disruptions": "warning",
  "Regulation & Compliance": "neutral",
  "Weather & Natural Events": "warning",
};

export function IntelligenceCard({ item, onSelect }: IntelligenceCardProps) {
  const level = (item.impactLevel ?? "low") as ImpactLevel;
  const config = IMPACT_CONFIG[level];

  return (
    <Card
      className={`border-l-4 ${config.border} overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onSelect(item)}
    >
      <CardContent className="p-3 flex flex-col gap-2">
        {/* Top metadata row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
            <span
              className="text-body-medium-xsm uppercase tracking-wide"
              style={{ color: config.textColor }}
            >
              {config.label}
            </span>
          </span>

          <span className="text-[var(--color-text-tertiary)]">·</span>

          {item.categoryTags?.map((cat) => (
            <Badge key={cat} intent={CATEGORY_INTENT[cat] ?? "neutral"} size="xs">
              {cat}
            </Badge>
          ))}

          {item.vesselTypes?.map((vt) => (
            <Badge key={vt} intent="neutral" size="xs">
              {vt}
            </Badge>
          ))}

          {item.regions?.map((r) => (
            <Badge key={r} intent="neutral" size="xs">
              {r}
            </Badge>
          ))}
        </div>

        {/* Source + time */}
        <SourceLine sourceName={item.sourceName} publishedAt={item.publishedAt} />

        {/* Headline */}
        <h3 className="text-body-strong-md text-[var(--color-text-primary)] leading-snug">
          {item.title}
        </h3>

        {/* Blurb */}
        {item.summary && (
          <p className="text-body-md text-[var(--color-text-secondary)] line-clamp-3 leading-snug">
            {item.summary}
          </p>
        )}

        {/* Key signals */}
        {item.keySignals && item.keySignals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.keySignals.map((signal, i) => (
              <Tag key={i} size="s" variant="rectangular">{signal}</Tag>
            ))}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="s"
            onClick={() => onSelect(item)}
            aria-label="View full intelligence details"
          >
            <ArrowRight size={14} className="mr-1" />
            View details
          </Button>
          <Button
            variant="ghost"
            size="s"
            aria-label="Search contracts affected by this item"
          >
            <Search size={14} className="mr-1" />
            Search affected contracts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const SOURCE_DOMAINS: Record<string, string> = {
  Reuters: "reuters.com",
  TradeWinds: "tradewindsnews.com",
  "Lloyd's List": "lloydslist.com",
  Splash247: "splash247.com",
  Bloomberg: "bloomberg.com",
  BIMCO: "bimco.org",
  IMO: "imo.org",
};

export function SourceLine({
  sourceName,
  publishedAt,
}: {
  sourceName?: string;
  publishedAt: number;
}) {
  const domain = sourceName ? SOURCE_DOMAINS[sourceName] : undefined;
  return (
    <div className="flex items-center gap-1.5">
      {domain && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt=""
          width={14}
          height={14}
          className="rounded-sm flex-shrink-0"
          aria-hidden="true"
        />
      )}
      {sourceName && (
        <span className="text-body-medium-xsm text-[var(--color-text-secondary)]">
          {sourceName}
        </span>
      )}
      <span className="text-body-xsm text-[var(--color-text-tertiary)]">
        {sourceName ? "· " : ""}{formatRelativeTime(publishedAt)}
      </span>
    </div>
  );
}
