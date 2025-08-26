import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export interface BreadcrumbItem {
  title: string;
  path?: string; // undefined for last item (current page)
  isLoading?: boolean;
}

// Route configuration for hierarchical breadcrumbs
const routeConfig: Record<string, { title: string; parent?: string }> = {
  '/home': { title: 'Home' },
  '/boards': { title: 'Boards', parent: '/home' },
  '/freight-planner': { title: 'Freight planner', parent: '/home' },
  '/trade-desk': { title: 'Trade desk', parent: '/home' },
  '/new-order': { title: 'New order', parent: '/trade-desk' },
  '/mailing-list': { title: 'Mailing list', parent: '/trade-desk' },
  '/contracts': { title: 'Contracts', parent: '/home' },
  '/compliance': { title: 'Compliance', parent: '/home' },
  '/global-market': { title: 'Global market', parent: '/home' },
  '/assets': { title: 'Assets', parent: '/home' },
  '/fixtures': { title: 'Fixtures', parent: '/home' },
  '/notifications': { title: 'Notifications', parent: '/home' },
  '/help-support': { title: 'Help & support', parent: '/home' },
  '/user-profile': { title: 'User Profile', parent: '/home' },
  '/organization-settings': { title: 'Organization Settings', parent: '/home' },
};

export function useBreadcrumb(pathname: string): BreadcrumbItem[] {
  // Check if this is a dynamic route like /boards/:id
  const boardIdMatch = pathname.match(/^\/boards\/(.+)$/);
  const boardId = boardIdMatch?.[1];

  // Fetch board data if we're on a board detail page
  const boardData = useQuery(
    api.boards.getBoardById,
    boardId ? { boardId: boardId as any } : "skip"
  );

  return useMemo(() => {
    const items: BreadcrumbItem[] = [];

    // Handle dynamic routes
    if (boardIdMatch) {
      // For /boards/:id, build: Home > Boards > [Board Title]
      items.push(
        { title: 'Home', path: '/home' },
        { title: 'Boards', path: '/boards' },
        { 
          title: boardData?.title || 'Loading...', 
          isLoading: boardData === undefined 
        }
      );
      return items;
    }

    // Handle static routes with hierarchy
    const buildHierarchy = (path: string): BreadcrumbItem[] => {
      const config = routeConfig[path];
      if (!config) {
        // Fallback for unknown routes
        return [{ title: path }];
      }

      const hierarchy: BreadcrumbItem[] = [];
      
      // Recursively build parent hierarchy
      if (config.parent && config.parent !== path) {
        hierarchy.push(...buildHierarchy(config.parent));
      }
      
      // Add current item
      hierarchy.push({
        title: config.title,
        path: path === pathname ? undefined : path // No path for current page
      });

      return hierarchy;
    };

    return buildHierarchy(pathname);
  }, [pathname, boardData, boardIdMatch]);
}