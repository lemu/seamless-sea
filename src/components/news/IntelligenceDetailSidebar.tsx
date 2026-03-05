import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  Badge,
  Button,
} from "@rafal.lemieszewski/tide-ui";
import { Bookmark, Sparkles, ExternalLink } from "lucide-react";
import type { ImpactLevel } from "../../types/news";
import type { IntelligenceItem } from "./IntelligenceCard";
import { SourceLine } from "./IntelligenceCard";

interface IntelligenceDetailSidebarProps {
  item: IntelligenceItem | null;
  onClose: () => void;
}

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; dot: string; textColor: string; bg: string }> = {
  high: { label: "High Impact", dot: "bg-red-500", textColor: "#dc2626", bg: "bg-red-50" },
  medium: { label: "Medium Impact", dot: "bg-amber-500", textColor: "#d97706", bg: "bg-amber-50" },
  low: { label: "Low Impact", dot: "bg-green-500", textColor: "#16a34a", bg: "bg-green-50" },
};

const CATEGORY_INTENT: Record<string, "destructive" | "warning" | "information" | "neutral"> = {
  "Geopolitics & Security": "destructive",
  "Trade Flows & Commodity Markets": "information",
  "Freight Market Movements": "information",
  "Port & Canal Disruptions": "warning",
  "Regulation & Compliance": "neutral",
  "Weather & Natural Events": "warning",
};

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-body-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
        {label}
      </h4>
      <p className="text-body-sm text-[var(--color-text-primary)] leading-relaxed">{content}</p>
    </div>
  );
}

export function IntelligenceDetailSidebar({ item, onClose }: IntelligenceDetailSidebarProps) {
  if (!item) return null;

  const level = (item.impactLevel ?? "low") as ImpactLevel;
  const config = IMPACT_CONFIG[level];

  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[480px] max-w-full overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 border-b border-[var(--color-border-subtle,#e5e7eb)]">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-heading-sm text-[var(--color-text-primary)] leading-snug">
              {item.title}
            </SheetTitle>
          </div>
          <SheetClose aria-label="Close details panel" />
        </div>

        {/* Meta strip */}
        <div className={`flex flex-wrap items-center gap-2 px-6 py-3 ${config.bg} border-b border-[var(--color-border-subtle,#e5e7eb)]`}>
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
            <span
              className="text-body-xs font-semibold uppercase tracking-wide"
              style={{ color: config.textColor }}
            >
              {config.label}
            </span>
          </span>

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

        {/* Source line */}
        <div className="px-6 py-3 border-b border-[var(--color-border-subtle,#e5e7eb)]">
          <SourceLine sourceName={item.sourceName} publishedAt={item.publishedAt} />
          {item.isAiGenerated && (
            <div className="flex items-center gap-1 mt-1.5 text-body-xs text-[var(--color-text-tertiary)]">
              <Sparkles size={11} />
              <span>AI-generated summary — always verify with source</span>
            </div>
          )}
        </div>

        {/* Intelligence layers */}
        <div className="flex flex-col gap-5 px-6 py-5 flex-1">
          {item.summary && <Section label="Summary" content={item.summary} />}

          {item.shippingInsight && (
            <>
              <hr className="border-[var(--color-border-subtle,#e5e7eb)]" />
              <Section label="Shipping Insight" content={item.shippingInsight} />
            </>
          )}

          {item.marketImpact && (
            <>
              <hr className="border-[var(--color-border-subtle,#e5e7eb)]" />
              <Section label="Market Impact" content={item.marketImpact} />
            </>
          )}

          {item.contractRisk && (
            <>
              <hr className="border-[var(--color-border-subtle,#e5e7eb)]" />
              <Section label="Contract Risk" content={item.contractRisk} />
            </>
          )}

          {item.recommendedAction && (
            <>
              <hr className="border-[var(--color-border-subtle,#e5e7eb)]" />
              <Section label="Recommended Action" content={item.recommendedAction} />
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--color-border-subtle,#e5e7eb)] mt-auto">
          <Button variant="secondary" size="s" aria-label="Flag a contract related to this intelligence item">
            <Bookmark size={14} className="mr-1.5" />
            Flag Contract
          </Button>
          {item.isAiGenerated && (
            <span className="text-body-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
              <ExternalLink size={11} />
              Source article linked
            </span>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
