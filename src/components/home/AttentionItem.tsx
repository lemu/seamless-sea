import { Badge } from "@rafal.lemieszewski/tide-ui";
import { formatRelativeTime } from "../../utils/dataUtils";

interface AttentionItemProps {
  itemRef: string;
  label: string;
  status: string;
  updatedAt: number;
}

const STATUS_BADGE_MAP: Record<string, { intent: "warning" | "information" | "neutral" | "success" | "destructive"; label: string }> = {
  "pending": { intent: "warning", label: "Pending" },
  "on-subs": { intent: "information", label: "On Subs" },
  "draft": { intent: "neutral", label: "Draft" },
  "indicative-offer": { intent: "neutral", label: "Indicative Offer" },
  "indicative-bid": { intent: "neutral", label: "Indicative Bid" },
  "firm-offer": { intent: "information", label: "Firm Offer" },
  "firm-bid": { intent: "information", label: "Firm Bid" },
  "firm": { intent: "information", label: "Firm" },
  "firm-amendment": { intent: "warning", label: "Firm Amendment" },
  "on-subs-amendment": { intent: "warning", label: "On Subs Amendment" },
};

export function AttentionItem({ itemRef, label, status, updatedAt }: AttentionItemProps) {
  const badgeInfo = STATUS_BADGE_MAP[status] ?? { intent: "neutral" as const, label: status };

  return (
    <div className="flex items-center justify-between gap-2 py-1 border-t border-[var(--color-border-primary-subtle)] first:border-t-0">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-body-sm font-medium text-[var(--color-text-primary)] truncate">{itemRef}</span>
        <span className="text-body-xs text-[var(--color-text-secondary)] truncate">{label}</span>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge intent={badgeInfo.intent} size="xs">{badgeInfo.label}</Badge>
        <span className="text-body-xs text-[var(--color-text-tertiary)]">{formatRelativeTime(updatedAt)}</span>
      </div>
    </div>
  );
}
