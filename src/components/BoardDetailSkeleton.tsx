export function BoardDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title skeleton */}
          <div className="mb-2 h-12 w-96 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
          
          {/* Metadata skeleton */}
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
            <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-20 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
        </div>
      </div>

      {/* Board Content Skeleton */}
      <div className="flex min-h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border-primary-subtle)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-[var(--color-background-neutral-subtle)]" />
          <div className="mx-auto mb-2 h-8 w-40 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
          <div className="mx-auto mb-4 h-16 w-80 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
          <div className="h-10 w-32 animate-pulse rounded bg-[var(--color-background-neutral-subtle)]" />
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="rounded-lg bg-[var(--color-background-neutral-subtle)] p-4">
        <div className="mb-2 h-6 w-24 animate-pulse rounded bg-[var(--color-background-neutral-subtle-hovered)]" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-[var(--color-background-neutral-subtle-hovered)]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-background-neutral-subtle-hovered)]" />
        </div>
      </div>
    </div>
  );
}