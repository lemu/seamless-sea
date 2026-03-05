import { Card, CardContent, Skeleton } from "@rafal.lemieszewski/tide-ui";
import { AttentionItem } from "./AttentionItem";

interface AttentionItem {
  id: string;
  itemRef: string;
  label: string;
  status: string;
  updatedAt: number;
}

interface AttentionCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  items: AttentionItem[];
  isLoading?: boolean;
}

export function AttentionCard({ icon, title, count, items, isLoading }: AttentionCardProps) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col gap-0 p-3 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-brand-bold)]">{icon}</span>
            <span className="text-body-sm font-medium text-[var(--color-text-primary)]">{title}</span>
          </div>
          {isLoading ? (
            <Skeleton className="w-6 h-5 rounded-full" />
          ) : (
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-body-xs font-semibold min-w-[22px] ${
                count > 0
                  ? "bg-[var(--color-surface-brand-subtle)] text-[var(--color-text-brand-bold)]"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]"
              }`}
            >
              {count}
            </span>
          )}
        </div>

        {/* Item list */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex flex-col gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex justify-between items-center py-1 border-t border-[var(--color-border-primary-subtle)] first:border-t-0">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="w-24 h-3 rounded" />
                    <Skeleton className="w-32 h-3 rounded" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Skeleton className="w-16 h-4 rounded" />
                    <Skeleton className="w-12 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-2 gap-1">
              <span className="text-body-sm text-[var(--color-text-tertiary)]">All clear ✓</span>
              <span className="text-body-xs text-[var(--color-text-tertiary)]">Nothing needs attention here</span>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <AttentionItem
                  key={item.id}
                  itemRef={item.itemRef}
                  label={item.label}
                  status={item.status}
                  updatedAt={item.updatedAt}
                />
              ))}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
