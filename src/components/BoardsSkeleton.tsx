import { LayoutDashboard } from "lucide-react";
import { Button, Icon } from "@rafal.lemieszewski/tide-ui";

function BoardCardSkeleton() {
  return (
    <div className="relative rounded-l border border-[var(--color-border-primary-subtle)] p-4">
      {/* Pin button — matches absolute top-2 right-2 h-6 w-6 */}
      <div className="absolute top-2 right-2 h-6 w-6 animate-pulse rounded bg-[var(--color-bg-secondary)]" />

      {/* Title row — matches mb-3 flex items-center gap-3 with h-5 text */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Footer — matches text-caption-sm flex items-center justify-between */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
      </div>
    </div>
  );
}

export function BoardsSkeleton() {
  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <BoardCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function BoardsEmptyState({ onCreateBoard }: { onCreateBoard: () => void }) {
  return (
    <div className="py-12 text-center">
      <Icon
        name={LayoutDashboard}
        size="l"
        className="mx-auto mb-4 text-[var(--color-text-tertiary)]"
      />
      <h3 className="text-heading-lg mb-2 text-[var(--color-text-primary)]">
        No boards yet
      </h3>
      <p className="text-body-md mb-4 text-[var(--color-text-secondary)]">
        Create your first board to get started with dashboards
      </p>
      <Button onClick={onCreateBoard}>Create Board</Button>
    </div>
  );
}