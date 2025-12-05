import * as React from "react";
import { useNavigate, useMatches, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@rafal.lemieszewski/tide-ui";

interface Crumb {
  title: string;
  path: string;
  isRedirectOnly?: boolean;
  isLast?: boolean;
}

// Dynamic Breadcrumbs Component using React Router 7 useMatches
function DynamicBreadcrumbs() {
  const navigate = useNavigate();
  const matches = useMatches();
  const location = useLocation();

  // Get board data for dynamic board titles
  const boardMatch = matches.find(
    (match: unknown) =>
      match &&
      typeof match === "object" &&
      "params" in match &&
      match.params &&
      typeof match.params === "object" &&
      "id" in match.params &&
      "pathname" in match &&
      typeof match.pathname === "string" &&
      match.pathname.startsWith("/boards/"),
  ) as { params: { id: string }; pathname: string } | undefined;
  const boardId = boardMatch?.params?.id;
  const boardData = useQuery(
    api.boards.getBoardById,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip",
  );

  // Filter matches that have breadcrumb handles
  const routeCrumbs = matches
    .filter(
      (match) =>
        match &&
        typeof match === "object" &&
        "handle" in match &&
        match.handle &&
        typeof match.handle === "object" &&
        "crumb" in match.handle,
    )
    .map((match: unknown) => {
      const matchTyped = match as {
        handle: { crumb: (match: unknown) => string; redirectOnly?: boolean };
        pathname: string;
        params?: Record<string, string | undefined>;
      };
      const handle = matchTyped.handle;
      const crumbFn = handle?.crumb;
      const path = matchTyped.pathname;
      const isRedirectOnly = handle?.redirectOnly || false;

      // Special handling for board detail routes
      if (matchTyped.params?.id && matchTyped.pathname.startsWith("/boards/")) {
        const title = boardData?.title || "Loading...";
        return { title, path, isRedirectOnly };
      }

      const title =
        typeof crumbFn === "function"
          ? crumbFn(matchTyped)
          : String(crumbFn || "");
      return { title, path, isRedirectOnly };
    });

  // Build final breadcrumb array
  let crumbs: Crumb[] = [];

  // If we're not on Home, add Home as first item
  if (location.pathname !== "/home") {
    crumbs.push({ title: "Home", path: "/home" });
  }

  // Add route-based crumbs
  crumbs = crumbs.concat(routeCrumbs);

  // Mark the last item
  crumbs = crumbs.map((crumb, index, array) => ({
    ...crumb,
    isLast: index === array.length - 1,
  }));

  if (crumbs.length === 0) {
    return (
      <BreadcrumbItem>
        <BreadcrumbPage className="max-w-[120px] truncate sm:max-w-[200px]">
          Dashboard
        </BreadcrumbPage>
      </BreadcrumbItem>
    );
  }

  return (
    <>
      {crumbs.map((crumb, index) => (
        <React.Fragment key={`${crumb.path}-${index}`}>
          <BreadcrumbItem>
            {crumb.isLast ? (
              <BreadcrumbPage className="max-w-[120px] truncate sm:max-w-[200px]">
                {crumb.title}
              </BreadcrumbPage>
            ) : crumb.isRedirectOnly ? (
              <span className="block max-w-[100px] truncate text-[var(--color-text-secondary)] sm:max-w-none">
                {crumb.title}
              </span>
            ) : (
              <BreadcrumbLink
                onClick={() => navigate(crumb.path)}
                className="block max-w-[100px] cursor-pointer truncate sm:max-w-none"
              >
                {crumb.title}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!crumb.isLast && <BreadcrumbSeparator />}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Header content for AppFrame (breadcrumbs only)
 * Actions are now passed separately via headerActions prop
 */
export function HeaderContent() {
  return (
    <Breadcrumb className="min-w-0 flex-1">
      <BreadcrumbList className="flex-nowrap">
        <DynamicBreadcrumbs />
      </BreadcrumbList>
    </Breadcrumb>
  );
}
