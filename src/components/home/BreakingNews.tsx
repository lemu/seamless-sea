import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, Badge, Skeleton } from "@rafal.lemieszewski/tide-ui";
import { Link } from "react-router";
import { formatRelativeTime } from "../../utils/dataUtils";

const CATEGORY_VARIANTS: Record<string, "warning" | "information" | "neutral" | "destructive" | "success"> = {
  Market: "information",
  Regulatory: "warning",
  Geopolitical: "destructive",
  Port: "neutral",
};

function NewsCardSkeleton() {
  return (
    <Card className="flex-1 min-w-[260px] max-w-xs">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-5 rounded" />
          <Skeleton className="w-12 h-3 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="w-full h-4 rounded" />
          <Skeleton className="w-4/5 h-4 rounded" />
        </div>
        <Skeleton className="w-20 h-3 rounded" />
      </CardContent>
    </Card>
  );
}

export function BreakingNews() {
  const newsItems = useQuery(api.home.getLatestNews, { limit: 3 });
  const isLoading = newsItems === undefined;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading-sm text-[var(--color-text-primary)]">Breaking News</h2>
        <Link
          to="/news"
          className="text-body-sm text-[var(--color-text-brand-bold)] hover:text-[var(--color-text-brand-bold-hovered)] transition-colors"
        >
          View all news →
        </Link>
      </div>

      <div className="flex flex-row gap-4 overflow-x-auto pb-1">
        {isLoading ? (
          <>
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
          </>
        ) : (
          newsItems.map((item) => {
            const categoryVariant = CATEGORY_VARIANTS[item.category] ?? "neutral";
            return (
              <Card key={String(item._id)} className="flex-1 min-w-[260px] max-w-sm hover:shadow-md transition-shadow">
                <CardContent className="flex flex-col gap-3 p-4 h-full">
                  <div className="flex items-center gap-2">
                    <Badge intent={categoryVariant} size="xs">{item.category}</Badge>
                    {item.priority === "breaking" && (
                      <Badge intent="destructive" size="xs">Breaking</Badge>
                    )}
                    <span className="text-body-xs text-[var(--color-text-tertiary)] ml-auto">
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>
                  <p className="text-body-sm font-medium text-[var(--color-text-primary)] leading-snug flex-1">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-body-xs text-[var(--color-text-secondary)] line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <div>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-body-xs text-[var(--color-text-brand-bold)] hover:text-[var(--color-text-brand-bold-hovered)] transition-colors"
                      >
                        Read more →
                      </a>
                    ) : (
                      <Link
                        to="/news"
                        className="text-body-xs text-[var(--color-text-brand-bold)] hover:text-[var(--color-text-brand-bold-hovered)] transition-colors"
                      >
                        Read more →
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
