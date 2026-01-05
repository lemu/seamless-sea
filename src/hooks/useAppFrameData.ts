import { useLocation } from "react-router";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "./useUser";
import type { Id } from "../../convex/_generated/dataModel";

// Tide-UI AppFrame types
export interface AppFrameUser {
  _id?: Id<"users">;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface AppFrameTeam {
  _id?: Id<"organizations">;
  name?: string;
  role: string;
  plan?: string;
  avatarUrl?: string | null;
}

export interface AppFrameNavItem {
  title: string;
  icon: string;
  url: string;
  isActive: boolean;
  items?: Array<{
    title: string;
    url: string;
    isActive: boolean;
  }>;
}

export interface AppFrameNavigationData {
  main: AppFrameNavItem[];
  operations: AppFrameNavItem[];
  intelligence: AppFrameNavItem[];
  support: AppFrameNavItem[];
}

export interface UseAppFrameDataReturn {
  navigationData: AppFrameNavigationData;
  user: AppFrameUser | null;
  teams: AppFrameTeam[];
  currentOrganization: AppFrameTeam | undefined;
  isLoading: boolean;
}

/**
 * Hook to provide data for Tide-UI AppFrame component
 * Fetches user and organizations from Convex and formats them
 * for the AppFrame component's expected shape
 */
export function useAppFrameData(): UseAppFrameDataReturn {
  const location = useLocation();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useUser();
  const currentPath = location.pathname;

  // Fetch user's organizations
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user?._id ? { userId: user._id } : "skip"
  );

  // Get the current active organization (first one for now)
  const currentOrganization = userOrganizations?.[0];

  // Simplified loading logic:
  // 1. Convex auth is still initializing
  // 2. User context is still loading
  // 3. Authenticated but waiting for organizations
  const isLoading =
    isConvexAuthLoading ||
    isUserLoading ||
    (isAuthenticated && userOrganizations === undefined);

  // Build navigation data
  const navigationData: AppFrameNavigationData = {
    main: [
      {
        title: "Home",
        icon: "house",
        url: "/home",
        isActive: currentPath === "/home",
      },
      {
        title: "Boards",
        icon: "layout-dashboard",
        url: "/boards",
        isActive: currentPath === "/boards" || currentPath.startsWith("/boards/"),
      },
    ],
    operations: [
      {
        title: "Freight planner",
        icon: "ship",
        url: "/freight-planner",
        isActive: currentPath === "/freight-planner",
        items: [],
      },
      {
        title: "Trade desk",
        icon: "trending-up",
        url: "/trade-desk",
        isActive: currentPath === "/trade-desk",
        items: [],
      },
      {
        title: "Agreements",
        icon: "scroll-text",
        url: "/agreements",
        isActive:
          currentPath === "/agreements" ||
          currentPath === "/agreements/recaps" ||
          currentPath === "/agreements/contracts" ||
          currentPath === "/agreements/clause-library",
        items: [
          {
            title: "Recaps",
            url: "/agreements/recaps",
            isActive: currentPath === "/agreements/recaps",
          },
          {
            title: "Contracts",
            url: "/agreements/contracts",
            isActive: currentPath === "/agreements/contracts",
          },
          {
            title: "Clause library",
            url: "/agreements/clause-library",
            isActive: currentPath === "/agreements/clause-library",
          },
        ],
      },
      {
        title: "Compliance",
        icon: "shield-check",
        url: "/compliance",
        isActive: currentPath === "/compliance",
        items: [],
      },
    ],
    intelligence: [
      {
        title: "SeaNet",
        icon: "map",
        url: "/seanet",
        isActive: currentPath === "/seanet",
      },
      {
        title: "Global market",
        icon: "globe",
        url: "/global-market",
        isActive: currentPath === "/global-market",
      },
      {
        title: "Assets",
        icon: "container",
        url: "/assets",
        isActive: currentPath === "/assets",
      },
      {
        title: "Fixtures",
        icon: "anchor",
        url: "/fixtures",
        isActive: currentPath === "/fixtures",
      },
    ],
    support: [
      {
        title: "Notifications",
        icon: "bell",
        url: "/notifications",
        isActive: currentPath === "/notifications",
      },
      {
        title: "Help & support",
        icon: "circle-help",
        url: "/help-support",
        isActive: currentPath === "/help-support",
      },
    ],
  };

  return {
    navigationData,
    user: user || null,
    teams: (userOrganizations || [])
      .filter(org => org && org._id && org.name)
      .map(org => ({
        _id: org._id,
        name: org.name,
        role: "Admin", // TODO: Get actual role from membership
        plan: org.plan || "Free",
        avatarUrl: org.avatarUrl || null,
      })),
    currentOrganization,
    isLoading,
  };
}
