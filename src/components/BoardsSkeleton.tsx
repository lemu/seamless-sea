import { Button, Icon } from "@rafal.lemieszewski/tide-ui";

export function BoardsSkeleton() {
  // Create 6 skeleton cards to match typical grid layout
  const skeletonCards = Array.from({ length: 6 }, (_, index) => (
    <div
      key={index}
      className="group relative rounded-lg border border-[var(--color-border-primary-subtle)] p-4"
    >
      {/* Pin button area */}
      <div className="absolute top-2 right-2 h-6 w-6 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />

      {/* Board title */}
      <div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />

      {/* Description area (show on some cards) */}
      {index % 2 === 0 && (
        <div className="mb-3 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
        </div>
      )}

      {/* Footer metadata */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
        {index % 3 === 0 && (
          <div className="h-3 w-12 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
        )}
      </div>
    </div>
  ));

  return (
    <div className="space-y-6 p-6">
      {/* Header - matches the real header structure */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 h-10 w-32 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
          <div className="h-5 w-48 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
      </div>

      {/* Boards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skeletonCards}
      </div>
    </div>
  );
}

export function BoardsEmptyState({ onCreateBoard }: { onCreateBoard: () => void }) {
  return (
    <div className="py-12 text-center">
      <Icon
        name="layout-dashboard"
        size="lg"
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