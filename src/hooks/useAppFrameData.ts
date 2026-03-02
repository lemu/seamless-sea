import { useLocation } from "react-router";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "./useUser";
import type { Id } from "../../convex/_generated/dataModel";
import type { ComponentType } from "react";
import {
  House, LayoutDashboard, Ship, TrendingUp, ScrollText,
  ShieldCheck, Map, Globe, Container, Anchor, Bell, CircleHelp,
} from "lucide-react";

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
  icon: ComponentType;
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
        icon: House,
        url: "/home",
        isActive: currentPath === "/home",
      },
      {
        title: "Boards",
        icon: LayoutDashboard,
        url: "/boards",
        isActive: currentPath === "/boards" || currentPath.startsWith("/boards/"),
      },
    ],
    operations: [
      {
        title: "Voyage economics",
        icon: Ship,
        url: "/voyage-economics",
        isActive: currentPath === "/voyage-economics",
        items: [],
      },
      {
        title: "Trade desk",
        icon: TrendingUp,
        url: "/trade-desk",
        isActive: currentPath === "/trade-desk",
        items: [],
      },
      {
        title: "Agreements",
        icon: ScrollText,
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
        icon: ShieldCheck,
        url: "/compliance",
        isActive: currentPath === "/compliance",
        items: [],
      },
    ],
    intelligence: [
      {
        title: "SeaNet",
        icon: Map,
        url: "/seanet",
        isActive: currentPath === "/seanet",
      },
      {
        title: "Global market",
        icon: Globe,
        url: "/global-market",
        isActive: currentPath.startsWith("/global-market"),
        items: [
          { title: "Supply", url: "/global-market/supply", isActive: currentPath === "/global-market/supply" },
          { title: "Commodities", url: "/global-market/commodities", isActive: currentPath === "/global-market/commodities" },
          { title: "Freight", url: "/global-market/freight", isActive: currentPath === "/global-market/freight" },
        ],
      },
      {
        title: "Assets",
        icon: Container,
        url: "/assets",
        isActive: currentPath.startsWith("/assets"),
        items: [
          { title: "Vessels", url: "/assets/vessels", isActive: currentPath === "/assets/vessels" },
          { title: "Fleets", url: "/assets/fleets", isActive: currentPath === "/assets/fleets" },
          { title: "Ports", url: "/assets/ports", isActive: currentPath === "/assets/ports" },
          { title: "Canals", url: "/assets/canals", isActive: currentPath === "/assets/canals" },
        ],
      },
      {
        title: "Fixtures",
        icon: Anchor,
        url: "/fixtures",
        isActive: currentPath === "/fixtures",
      },
    ],
    support: [
      {
        title: "Notifications",
        icon: Bell,
        url: "/notifications",
        isActive: currentPath === "/notifications",
      },
      {
        title: "Help & support",
        icon: CircleHelp,
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
