import * as React from "react";
import { useUser } from "../hooks";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocation, useNavigate, useMatches } from "react-router";
import type { Id } from "../../convex/_generated/dataModel";

// Type definitions
interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  avatar?: string;
  avatarUrl?: string | null;
}

interface Organization {
  _id?: Id<"organizations">;
  name?: string;
  role: string;
  plan?: string;
  avatarUrl?: string | null;
  logo?: string;
}

interface PinnedBoard {
  _id: Id<"boards">;
  title: string;
}

interface MenuSubItem {
  title: string;
  url: string;
  isActive: boolean;
}

interface MenuItem {
  title: string;
  icon: string;
  url: string;
  isActive: boolean;
  items?: MenuSubItem[];
}

interface Crumb {
  title: string;
  path: string;
  isRedirectOnly?: boolean;
  isLast?: boolean;
}
import {
  Icon,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Kbd,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@rafal.lemieszewski/tide-ui";

// Temporary import from shadcn UI until Tide UI has SidebarMenuAction
import { SidebarMenuAction } from "./ui/sidebar";

// Helper functions for user avatar handling
const getUserInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// Function to generate sidebar data based on current path
const getSidebarData = (
  currentPath: string,
  user: User | null,
  organizations: Organization[],
  pinnedBoards: PinnedBoard[],
) => {
  return {
    user: user || {
      _id: "" as Id<"users">,
      name: "Guest User",
      email: "guest@example.com",
      avatar: undefined,
      avatarUrl: null,
    },
    teams: organizations || [],
    navigation: {
      main: [
        {
          title: "Home",
          icon: "house",
          url: "/home",
          isActive: currentPath === "/home",
        },
      ],
      management: [
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
          isActive:
            currentPath === "/trade-desk" ||
            currentPath === "/trade-desk/new-order" ||
            currentPath === "/trade-desk/mailing-list",
          items: [
            {
              title: "New order",
              url: "/trade-desk/new-order",
              isActive: currentPath === "/trade-desk/new-order",
            },
            {
              title: "Mailing list",
              url: "/trade-desk/mailing-list",
              isActive: currentPath === "/trade-desk/mailing-list",
            },
          ],
        },
        {
          title: "Contracts",
          icon: "scroll-text",
          url: "/contracts",
          isActive: currentPath === "/contracts",
          items: [],
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
      boards: pinnedBoards.map((board: PinnedBoard) => ({
        title: board.title,
        icon: "layout-dashboard" as const,
        url: `/boards/${board._id}`,
        isActive: currentPath === `/boards/${board._id}`,
      })),
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
    },
  };
};

// Helper function to check if any child item is active
const hasActiveChild = (item: { items?: Array<{ isActive: boolean }> }) => {
  return item.items && item.items.some((subItem) => subItem.isActive);
};

// Helper function to get tooltip text for menu items
const getTooltipText = (item: {
  title: string;
  items?: Array<{ title: string; isActive: boolean }>;
}) => {
  if (item.items && item.items.length > 0) {
    const activeSubitem = item.items.find((subItem) => subItem.isActive);
    if (activeSubitem) {
      return `${item.title} → ${activeSubitem.title}`;
    }
  }
  return item.title;
};

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


// Helper function to detect macOS
const isMacOS = () => {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
  );
};

// App Sidebar Component with full functionality restored
function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

  // Fetch user's organizations
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user ? { userId: user._id } : "skip",
  );

  // Get the current active organization (first one for now)
  const currentOrganization = userOrganizations?.[0];

  // Fetch user's pinned boards in current organization
  const pinnedBoards = useQuery(
    api.boards.getPinnedBoards,
    user && currentOrganization?._id
      ? {
          userId: user._id,
          organizationId: currentOrganization._id,
        }
      : "skip",
  );

  const createBoard = useMutation(api.boards.createBoard);
  const updateBoard = useMutation(api.boards.updateBoard);
  const deleteBoard = useMutation(api.boards.deleteBoard);
  const unpinBoard = useMutation(api.boards.unpinBoard);

  const sidebarData = getSidebarData(
    location.pathname,
    user,
    userOrganizations || [],
    pinnedBoards || [],
  );
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [newBoardModalOpen, setNewBoardModalOpen] = React.useState(false);
  const [newBoardTitle, setNewBoardTitle] = React.useState("");
  const [isCreatingBoard, setIsCreatingBoard] = React.useState(false);
  
  // Board menu modals state
  const [renameBoardModalOpen, setRenameBoardModalOpen] = React.useState(false);
  const [deleteBoardModalOpen, setDeleteBoardModalOpen] = React.useState(false);
  const [selectedBoard, setSelectedBoard] = React.useState<MenuItem | null>(null);
  const [renameBoardTitle, setRenameBoardTitle] = React.useState("");
  const [isUpdatingBoard, setIsUpdatingBoard] = React.useState(false);
  const [isDeletingBoard, setIsDeletingBoard] = React.useState(false);

  const handleCreateBoard = async (title: string) => {
    if (!user || !currentOrganization?._id) return;
    
    setIsCreatingBoard(true);
    try {
      const boardId = await createBoard({
        title,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
      
      // Close modal and clear form
      setNewBoardModalOpen(false);
      setNewBoardTitle("");
      
      // Navigate to the new board
      navigate(`/boards/${boardId}`);
    } catch (error) {
      console.error("Failed to create board:", error);
      alert("Failed to create board");
    } finally {
      setIsCreatingBoard(false);
    }
  };

  // Board menu handlers
  const handleUnpinBoard = async (board: MenuItem) => {
    if (!user || !currentOrganization?._id) return;
    
    try {
      // Extract board ID from URL
      const boardId = board.url.split('/').pop();
      if (!boardId) return;
      
      await unpinBoard({
        boardId: boardId as Id<"boards">,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
    } catch (error) {
      console.error("Failed to unpin board:", error);
    }
  };

  const handleRenameBoard = (board: MenuItem) => {
    setSelectedBoard(board);
    setRenameBoardTitle(board.title);
    setRenameBoardModalOpen(true);
  };

  const handleDeleteBoard = (board: MenuItem) => {
    setSelectedBoard(board);
    setDeleteBoardModalOpen(true);
  };

  const handleRenameBoardSubmit = async (title: string) => {
    if (!selectedBoard) return;
    
    setIsUpdatingBoard(true);
    try {
      const boardId = selectedBoard.url.split('/').pop();
      if (!boardId) return;
      
      await updateBoard({
        boardId: boardId as Id<"boards">,
        title: title.trim(),
      });
      
      setRenameBoardModalOpen(false);
      setRenameBoardTitle("");
      setSelectedBoard(null);
    } catch (error) {
      console.error("Failed to rename board:", error);
    } finally {
      setIsUpdatingBoard(false);
    }
  };

  const handleDeleteBoardSubmit = async () => {
    if (!selectedBoard) return;
    
    setIsDeletingBoard(true);
    try {
      const boardId = selectedBoard.url.split('/').pop();
      if (!boardId) return;
      
      await deleteBoard({
        boardId: boardId as Id<"boards">,
      });
      
      setDeleteBoardModalOpen(false);
      setSelectedBoard(null);
      
      // If we were on the deleted board page, navigate to boards
      if (location.pathname === selectedBoard.url) {
        navigate('/boards');
      }
    } catch (error) {
      console.error("Failed to delete board:", error);
    } finally {
      setIsDeletingBoard(false);
    }
  };

  const [expandedItems, setExpandedItems] = React.useState<
    Record<string, boolean>
  >({
    "Trade desk": true, // Default expanded
  });

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemTitle]: !prev[itemTitle],
    }));
  };

  // Command/Search dialog keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (e.key === "p" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setCommandOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <TooltipProvider delayDuration={100}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="flex h-full flex-col border-r border-[var(--color-border-primary-subtle)] [&]:!transition-none [&>*]:!transition-none"
      >
        {/* Header with Company Logo */}
        <SidebarHeader className="border-b border-[var(--color-border-primary-subtle)] p-[var(--space-md)] group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <div className="flex h-[22px] w-7 items-center justify-center">
            <svg
              width="28"
              height="22"
              viewBox="0 0 28 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.39355 0.688477C6.89528 0.688477 8.12094 1.67409 8.12109 3.74609V7.69043H5.5332V2.87695H3.28711V8.03125L8.12109 11.458V18.2705C8.12109 20.3262 6.92916 21.3125 4.39355 21.3125C1.85827 21.3124 0.701172 20.3261 0.701172 18.2705L0.700195 13.7412H3.28711V19.1396H5.5332V12.6777L0.701172 9.23438V3.74609C0.701322 1.67422 1.89214 0.688597 4.39355 0.688477ZM13.8379 0.6875C16.4752 0.687615 17.6152 1.67395 17.6152 3.74609V10.5312L12.6113 13.7236V19.123H15.0273V14.3096H17.6143V18.2705C17.6143 20.3262 16.4235 21.3125 13.8027 21.3125C11.1821 21.3125 10.0244 20.3262 10.0244 18.2705V3.74609H10.0254C10.0254 1.67382 11.2003 0.6875 13.8379 0.6875ZM23.333 0.6875C25.9537 0.6875 27.1113 1.67378 27.1113 3.72949V18.2539H27.1104C27.1104 20.3261 25.9363 21.3125 23.2988 21.3125C20.6612 21.3125 19.5205 20.3262 19.5205 18.2539V11.4688L24.5254 8.27637V2.87695H22.1084V7.69043H19.5215V3.72949C19.5215 1.67384 20.7124 0.687556 23.333 0.6875ZM22.1084 12.2197V19.1396H24.5254V10.5986L22.1084 12.2197ZM12.6113 11.4014L15.0273 9.78027V2.86035H12.6113V11.4014Z"
                fill="#005F85"
              />
            </svg>
          </div>
        </SidebarHeader>

        {/* Content - scrollable area that takes remaining space */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto group-data-[collapsible=icon]:overflow-hidden" data-sidebar="content">
            {/* Search Section */}
          <div className="p-[var(--space-md)] pt-[var(--space-sm)] group-data-[collapsible=icon]:px-2">
            <div className="relative">
              <div className="absolute top-1/2 left-2 -translate-y-1/2 group-data-[collapsible=icon]:hidden">
                <Icon name="search" size="md" color="tertiary" />
              </div>
              {/* Full search button in expanded state */}
              <div className="group-data-[collapsible=icon]:hidden">
                <button
                  onClick={() => setCommandOpen(true)}
                  className="text-body-md flex h-8 w-full cursor-pointer items-center rounded-md border border-[var(--color-border-primary-subtle)] bg-[var(--color-surface-primary)] px-3 py-1 pr-20 pl-8 text-left text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-primary-bold)] hover:bg-[var(--color-background-neutral-subtle-hovered)] focus:ring-1 focus:ring-[var(--color-border-focus)] focus:outline-none active:border-[var(--color-border-primary-bold)]"
                >
                  Search
                </button>
                <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
                  <Kbd size="sm">{isMacOS() ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd size="sm">K</Kbd>
                </div>
              </div>

              {/* Icon-only search button in collapsed state */}
              <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCommandOpen(true)}
                    className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded border border-[var(--color-border-primary-subtle)] bg-transparent transition-all duration-200 group-data-[collapsible=icon]:flex hover:border-[var(--color-border-primary-bold)] hover:bg-[var(--color-background-neutral-subtle-hovered)] active:border-[var(--color-border-primary-bold)]"
                    aria-label="Search"
                  >
                    <Icon name="search" size="md" color="tertiary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="hidden group-data-[collapsible=icon]:block"
                >
                  <div className="flex items-center gap-2">
                    <span>Search</span>
                    <div className="flex gap-1">
                      <Kbd size="sm" variant="dark">
                        {isMacOS() ? "⌘" : "Ctrl"}
                      </Kbd>
                      <Kbd size="sm" variant="dark">
                        K
                      </Kbd>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Main Navigation */}
          <SidebarGroup className="px-2 pb-1 mt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarData.navigation.main.map((item: MenuItem) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={item.isActive}
                          className={`text-body-medium-md group cursor-pointer px-2 py-1.5 transition-colors ${item.isActive ? "hover:bg-[var(--color-background-brand-selected-hovered)] hover:text-[var(--color-text-brand-hovered)] active:bg-[var(--color-background-brand-selected-hovered)] active:text-[var(--color-text-brand-hovered)]" : "hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"}`}
                          onClick={() => navigate(item.url)}
                        >
                          <Icon
                            name={item.icon as string}
                            size="sm"
                            color={item.isActive ? "brand" : undefined}
                            className={
                              item.isActive
                                ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                : ""
                            }
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="hidden group-data-[collapsible=icon]:block"
                      >
                        {getTooltipText(item)}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Separator between Main and Management in collapsed state */}
          <div className="my-2 hidden justify-center px-2 group-data-[collapsible=icon]:flex">
            <Separator layout="vertical" />
          </div>

          {/* Management Section */}
          <SidebarGroup className="px-2 mt-1">
            <SidebarGroupLabel className="px-2 py-1 pb-1.5 text-[12px] font-medium text-[var(--color-text-tertiary)] group-data-[collapsible=icon]:hidden">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarData.navigation.management.map((item: MenuItem) => (
                  <SidebarMenuItem key={item.title}>
                    {item.items && item.items.length > 0 ? (
                      <>
                        {/* Expanded state - regular expandable menu */}
                        <div className="group-data-[collapsible=icon]:hidden">
                          <SidebarMenuButton
                            isActive={item.isActive && !item.items?.length}
                            className={`text-body-medium-md group cursor-pointer px-2 py-1.5 transition-colors hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)] ${item.isActive && !item.items?.length ? "hover:!bg-[var(--color-background-brand-selected-hovered)] hover:!text-[var(--color-text-brand-hovered)] active:!bg-[var(--color-background-brand-selected-hovered)] active:!text-[var(--color-text-brand-hovered)]" : ""}`}
                            onClick={() => toggleExpanded(item.title)}
                          >
                            <Icon
                              name={item.icon as string}
                              size="sm"
                              color={
                                item.isActive && !item.items?.length
                                  ? "brand"
                                  : undefined
                              }
                              className={
                                item.isActive && !item.items?.length
                                  ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                  : ""
                              }
                            />
                            <span>{item.title}</span>
                            <Icon
                              name="chevron-right"
                              size="sm"
                              className={`ml-auto transition-transform ${
                                expandedItems[item.title] ? "rotate-90" : ""
                              }`}
                            />
                          </SidebarMenuButton>
                        </div>

                        {/* Submenu items */}
                        {item.items &&
                          item.items.length > 0 &&
                          expandedItems[item.title] && (
                            <SidebarMenuSub>
                              {item.items.map((subItem: MenuSubItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    isActive={subItem.isActive}
                                    className={`[&]:text-body-md px-2 py-1.5 transition-colors hover:bg-[var(--color-background-neutral-subtle-hovered)] ${
                                      subItem.isActive
                                        ? "bg-[var(--color-background-brand-selected)] hover:!bg-[var(--color-background-brand-selected-hovered)] active:!bg-[var(--color-background-brand-selected-hovered)] [&]:!text-[var(--color-text-brand)] [&_a]:!text-[var(--color-text-brand)] [&>*]:!text-[var(--color-text-brand)]"
                                        : ""
                                    }`}
                                  >
                                    <button
                                      onClick={() => navigate(subItem.url)}
                                      className={`w-full cursor-pointer text-left transition-colors hover:text-[var(--color-text-primary)] ${subItem.isActive ? "!text-[var(--color-text-brand)] hover:!text-[var(--color-text-brand-hovered)] active:!text-[var(--color-text-brand-hovered)]" : ""}`}
                                      style={
                                        subItem.isActive
                                          ? { color: "var(--color-text-brand)" }
                                          : {}
                                      }
                                    >
                                      {subItem.title}
                                    </button>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}

                        {/* Collapsed state - dropdown with submenu */}
                        <div className="hidden group-data-[collapsible=icon]:block">
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <SidebarMenuButton
                                    isActive={hasActiveChild(item)}
                                    className={`text-body-medium-md group w-full cursor-pointer justify-center px-2 py-1.5 transition-colors ${hasActiveChild(item) ? "hover:bg-[var(--color-background-brand-selected-hovered)] hover:text-[var(--color-text-brand-hovered)] active:bg-[var(--color-background-brand-selected-hovered)] active:text-[var(--color-text-brand-hovered)]" : "hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"}`}
                                  >
                                    <Icon
                                      name={item.icon as string}
                                      size="sm"
                                      color={
                                        hasActiveChild(item)
                                          ? "brand"
                                          : undefined
                                      }
                                      className={
                                        hasActiveChild(item)
                                          ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                          : ""
                                      }
                                    />
                                  </SidebarMenuButton>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="hidden group-data-[collapsible=icon]:block"
                              >
                                {getTooltipText(item)}
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent
                              side="right"
                              sideOffset={8}
                              align="start"
                            >
                              <DropdownMenuLabel className="text-body-medium-sm font-medium">
                                {item.title}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {item.items.map((subItem: MenuSubItem) => (
                                <DropdownMenuItem
                                  key={subItem.title}
                                  onClick={() => navigate(subItem.url)}
                                  className={`cursor-pointer ${
                                    subItem.isActive
                                      ? "bg-[var(--color-background-brand-selected)] text-[var(--color-text-brand)]"
                                      : ""
                                  }`}
                                >
                                  {subItem.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Regular menu item without submenu */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              isActive={item.isActive}
                              className={`text-body-medium-md group cursor-pointer px-2 py-1.5 transition-colors ${item.isActive ? "hover:bg-[var(--color-background-brand-selected-hovered)] hover:text-[var(--color-text-brand-hovered)] active:bg-[var(--color-background-brand-selected-hovered)] active:text-[var(--color-text-brand-hovered)]" : "hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"}`}
                              onClick={() => navigate(item.url)}
                            >
                              <Icon
                                name={item.icon as string}
                                size="sm"
                                color={item.isActive ? "brand" : undefined}
                                className={
                                  item.isActive
                                    ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                    : ""
                                }
                              />
                              <span>{item.title}</span>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="hidden group-data-[collapsible=icon]:block"
                          >
                            {getTooltipText(item)}
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Separator between Management and Intelligence in collapsed state */}
          <div className="my-2 hidden justify-center px-2 group-data-[collapsible=icon]:flex">
            <Separator layout="vertical" />
          </div>

          {/* Intelligence Section */}
          <SidebarGroup className="px-2 mt-1">
            <SidebarGroupLabel className="px-2 py-1 pb-1.5 text-[12px] font-medium text-[var(--color-text-tertiary)] group-data-[collapsible=icon]:hidden">
              Intelligence
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarData.navigation.intelligence.map((item: MenuItem) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={item.isActive}
                          className={`text-body-medium-md group cursor-pointer px-2 py-1.5 transition-colors ${item.isActive ? "hover:bg-[var(--color-background-brand-selected-hovered)] hover:text-[var(--color-text-brand-hovered)] active:bg-[var(--color-background-brand-selected-hovered)] active:text-[var(--color-text-brand-hovered)]" : "hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"}`}
                          onClick={() => navigate(item.url)}
                        >
                          <Icon
                            name={item.icon as string}
                            size="sm"
                            color={item.isActive ? "brand" : undefined}
                            className={
                              item.isActive
                                ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                : ""
                            }
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="hidden group-data-[collapsible=icon]:block"
                      >
                        {getTooltipText(item)}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Separator between Intelligence and Boards in collapsed state */}
          <div className="my-2 hidden justify-center px-2 group-data-[collapsible=icon]:flex">
            <Separator layout="vertical" />
          </div>

          {/* Boards Section */}
          <SidebarGroup className="px-2 mt-1">
            <SidebarGroupLabel className="flex items-center justify-between px-2 py-1 pb-1.5 text-[12px] font-medium text-[var(--color-text-tertiary)] group-data-[collapsible=icon]:hidden">
              <span>Boards</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-neutral-subtle-hovered)] hover:text-[var(--color-text-secondary)]"
                onClick={() => setNewBoardModalOpen(true)}
              >
                <Icon name="plus" size="sm" className="text-[var(--color-text-tertiary)]" />
              </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarData.navigation.boards.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="text-caption-medium-sm px-2 py-1.5 text-[var(--color-text-secondary)] group-data-[collapsible=icon]:hidden">
                      No pinned boards
                    </div>
                  </SidebarMenuItem>
                ) : (
                  sidebarData.navigation.boards.map((item: MenuItem) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={item.isActive}
                          className={`text-body-medium-md group cursor-pointer px-2 py-1.5 transition-colors ${item.isActive ? "hover:bg-[var(--color-background-brand-selected-hovered)] hover:text-[var(--color-text-brand-hovered)] active:bg-[var(--color-background-brand-selected-hovered)] active:text-[var(--color-text-brand-hovered)]" : "hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"}`}
                          onClick={() => navigate(item.url)}
                        >
                          <Icon
                            name={item.icon as string}
                            size="sm"
                            color={item.isActive ? "brand" : undefined}
                            className={
                              item.isActive
                                ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                : ""
                            }
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="hidden group-data-[collapsible=icon]:block"
                      >
                        {getTooltipText(item)}
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Board Actions Menu - Only show in expanded state */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover className="group-data-[collapsible=icon]:hidden">
                          <Icon name="more-horizontal" size="sm" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => navigate(item.url)}
                          className="cursor-pointer"
                        >
                          <Icon name="eye" size="sm" />
                          <span>View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUnpinBoard(item)}
                          className="cursor-pointer"
                        >
                          <Icon name="pin-off" size="sm" />
                          <span>Unpin</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRenameBoard(item)}
                          className="cursor-pointer"
                        >
                          <Icon name="edit" size="sm" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteBoard(item)}
                          className="cursor-pointer text-[var(--color-text-destructive)] hover:bg-[var(--color-background-destructive-subtle)] hover:text-[var(--color-text-destructive)]"
                        >
                          <Icon name="trash" size="sm" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                  ))
                )}
                {/* Show all boards link */}
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        className="text-body-md cursor-pointer px-2 py-1.5 transition-colors hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"
                        onClick={() => navigate("/boards")}
                      >
                        <Icon name="more-horizontal" size="sm" />
                        <span>Show all</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="hidden group-data-[collapsible=icon]:block"
                    >
                      Show all boards
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Support Section - takes remaining space and aligns to bottom */}
          <SidebarGroup className="px-2 pb-2 flex-1 flex flex-col justify-end">
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarData.navigation.support.map((item: MenuItem) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={item.isActive}
                          className={`text-body-medium-md group cursor-pointer px-2 py-1.5 transition-colors ${item.isActive ? "hover:bg-[var(--color-background-brand-selected-hovered)] hover:text-[var(--color-text-brand-hovered)] active:bg-[var(--color-background-brand-selected-hovered)] active:text-[var(--color-text-brand-hovered)]" : "hover:bg-[var(--color-background-neutral-subtle-hovered)] active:bg-[var(--color-background-neutral-subtle-hovered)]"}`}
                          onClick={() => navigate(item.url)}
                        >
                          <Icon
                            name={item.icon as string}
                            size="sm"
                            color={item.isActive ? "brand" : undefined}
                            className={
                              item.isActive
                                ? "group-hover:text-[var(--color-icon-brand-hover)] group-active:text-[var(--color-icon-brand-hover)]"
                                : ""
                            }
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="hidden group-data-[collapsible=icon]:block"
                      >
                        {getTooltipText(item)}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer with User/Team Switcher */}
        <SidebarFooter className="border-t border-[var(--color-border-primary-subtle)] p-[var(--space-md)] group-data-[collapsible=icon]:px-2">
          {user && (
            <CombinedSwitcher
              user={user}
              teams={userOrganizations || []}
            />
          )}
        </SidebarFooter>

        <SidebarRail className="[&]:flex" />
      </Sidebar>

      {/* Command Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => window.location.reload()}>
              <Icon name="rotate-ccw" size="sm" className="mr-2" />
              <span>Reload Page</span>
              <span className="text-caption-sm ml-auto text-[var(--color-text-tertiary)]">
                {isMacOS() ? "⌘" : "Ctrl"}R
              </span>
            </CommandItem>
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <Icon name="search" size="sm" className="mr-2" />
              <span>Search</span>
              <span className="text-caption-sm ml-auto text-[var(--color-text-tertiary)]">
                {isMacOS() ? "⌘" : "Ctrl"}K
              </span>
            </CommandItem>
            <CommandItem onSelect={() => window.print()}>
              <Icon name="printer" size="sm" className="mr-2" />
              <span>Print Page</span>
              <span className="text-caption-sm ml-auto text-[var(--color-text-tertiary)]">
                {isMacOS() ? "⌘" : "Ctrl"}P
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Navigation">
            {sidebarData.navigation.main.map((item: MenuItem) => (
              <CommandItem
                key={item.title}
                onSelect={() => {
                  navigate(item.url);
                  setCommandOpen(false);
                }}
              >
                <Icon name={item.icon as string} size="sm" className="mr-2" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
            {sidebarData.navigation.management.map((item: MenuItem) => (
              <CommandItem
                key={item.title}
                onSelect={() => {
                  navigate(item.url);
                  setCommandOpen(false);
                }}
              >
                <Icon name={item.icon as string} size="sm" className="mr-2" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
            {sidebarData.navigation.intelligence.map((item: MenuItem) => (
              <CommandItem
                key={item.title}
                onSelect={() => {
                  navigate(item.url);
                  setCommandOpen(false);
                }}
              >
                <Icon name={item.icon as string} size="sm" className="mr-2" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
            {sidebarData.navigation.boards.map((item: MenuItem) => (
              <CommandItem
                key={item.title}
                onSelect={() => setCommandOpen(false)}
              >
                <Icon name={item.icon as string} size="sm" className="mr-2" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Settings">
            {sidebarData.navigation.support.map((item: MenuItem) => (
              <CommandItem
                key={item.title}
                onSelect={() => {
                  navigate(item.url);
                  setCommandOpen(false);
                }}
              >
                <Icon name={item.icon as string} size="sm" className="mr-2" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Switch Team">
            {sidebarData.teams.map((team: Organization) => (
              <CommandItem
                key={team.name}
                onSelect={() => setCommandOpen(false)}
              >
                <div className="mr-2 h-4 w-4 overflow-hidden rounded-sm">
                  <Avatar size="sm" shape="rounded">
                    <AvatarImage src={team.avatarUrl || undefined} alt={team.name} />
                    <AvatarFallback variant="primary" className="text-[8px]">
                      {team.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span>{team.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* New Board Modal */}
      {newBoardModalOpen && (
        <CreateBoardModal
          onClose={() => {
            setNewBoardModalOpen(false);
            setNewBoardTitle("");
          }}
          onCreate={handleCreateBoard}
          title={newBoardTitle}
          setTitle={setNewBoardTitle}
          isCreating={isCreatingBoard}
        />
      )}

      {/* Rename Board Modal */}
      {renameBoardModalOpen && (
        <RenameBoardModal
          onClose={() => {
            setRenameBoardModalOpen(false);
            setRenameBoardTitle("");
            setSelectedBoard(null);
          }}
          onRename={handleRenameBoardSubmit}
          title={renameBoardTitle}
          setTitle={setRenameBoardTitle}
          isRenaming={isUpdatingBoard}
        />
      )}

      {/* Delete Board Modal */}
      {deleteBoardModalOpen && (
        <DeleteBoardModal
          onClose={() => {
            setDeleteBoardModalOpen(false);
            setSelectedBoard(null);
          }}
          onDelete={handleDeleteBoardSubmit}
          boardTitle={selectedBoard?.title || ""}
          isDeleting={isDeletingBoard}
        />
      )}
    </TooltipProvider>
  );
}

// Create Board Modal Component (same as in Boards.tsx)
interface CreateBoardModalProps {
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
  title: string;
  setTitle: (title: string) => void;
  isCreating: boolean;
}

function CreateBoardModal({
  onClose,
  onCreate,
  title,
  setTitle,
  isCreating,
}: CreateBoardModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await onCreate(title.trim());
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[var(--color-surface-primary)] p-6 shadow-lg mx-4">
        <h2 className="text-heading-lg mb-4 text-[var(--color-text-primary)]">
          Create New Board
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-body-md mb-2 block text-[var(--color-text-primary)]">
              Board Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title..."
              className="w-full rounded-md border border-[var(--color-border-primary-subtle)] px-3 py-2 focus:border-[var(--color-border-brand)] focus:outline-none"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Board"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rename Board Modal Component
interface RenameBoardModalProps {
  onClose: () => void;
  onRename: (title: string) => Promise<void>;
  title: string;
  setTitle: (title: string) => void;
  isRenaming: boolean;
}

function RenameBoardModal({
  onClose,
  onRename,
  title,
  setTitle,
  isRenaming,
}: RenameBoardModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await onRename(title.trim());
    } catch (error) {
      console.error("Failed to rename board:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[var(--color-surface-primary)] p-6 shadow-lg mx-4">
        <h2 className="text-heading-lg mb-4 text-[var(--color-text-primary)]">
          Rename Board
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-body-md mb-2 block text-[var(--color-text-primary)]">
              Board Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title..."
              className="w-full rounded-md border border-[var(--color-border-primary-subtle)] px-3 py-2 focus:border-[var(--color-border-brand)] focus:outline-none"
              disabled={isRenaming}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose} disabled={isRenaming}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!title.trim() || isRenaming}
            >
              {isRenaming ? "Renaming..." : "Rename Board"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Board Modal Component
interface DeleteBoardModalProps {
  onClose: () => void;
  onDelete: () => Promise<void>;
  boardTitle: string;
  isDeleting: boolean;
}

function DeleteBoardModal({
  onClose,
  onDelete,
  boardTitle,
  isDeleting,
}: DeleteBoardModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onDelete();
    } catch (error) {
      console.error("Failed to delete board:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[var(--color-surface-primary)] p-6 shadow-lg mx-4">
        <h2 className="text-heading-lg mb-4 text-[var(--color-text-primary)]">
          Delete Board
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-body-md text-[var(--color-text-primary)]">
              Are you sure you want to delete <strong>'{boardTitle}'</strong>? This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Board"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Combined User/Team Switcher Component
interface CombinedSwitcherProps {
  user: User;
  teams: Organization[];
}

function CombinedSwitcher({ user, teams }: CombinedSwitcherProps) {
  const navigate = useNavigate();
  const [activeTeam, setActiveTeam] = React.useState<Organization | undefined>(
    teams[0],
  );

  // Update activeTeam when teams change
  React.useEffect(() => {
    if (teams && teams.length > 0 && !activeTeam) {
      setActiveTeam(teams[0]);
    }
  }, [teams, activeTeam]);

  return (
    <div className="rounded-md border border-[var(--color-border-primary-subtle)] group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:border-none">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto min-h-[48px] w-full justify-start rounded-md p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:min-h-[32px] group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          >
            {/* Expanded state - full layout */}
            <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:hidden">
              {/* Team/Company Avatar */}
              <div className="relative">
                <Avatar size="md" shape="rounded">
                  <AvatarImage
                    src={activeTeam?.avatarUrl || undefined}
                    alt={activeTeam?.name}
                  />
                  <AvatarFallback variant="primary">
                    {activeTeam?.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* User Avatar Overlay */}
                <div className="absolute -right-1 -bottom-1 rounded-full border-2 border-white">
                  <Avatar size="xs" shape="circle">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                    <AvatarFallback variant="primary">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* User/Team Info */}
              <div className="min-w-0 flex-1 text-left">
                <div className="text-body-medium-sm truncate font-medium text-[var(--color-text-primary)]">
                  {user.name}
                </div>
                <div className="text-body-xsm text-[var(--color-text-secondary)]">
                  {activeTeam?.role} at {activeTeam?.name}
                </div>
              </div>

              {/* Chevron */}
              <Icon name="chevron-down" size="md" className="opacity-50" />
            </div>

            {/* Collapsed state - just avatars */}
            <div className="relative hidden group-data-[collapsible=icon]:block">
              <Avatar size="sm" shape="rounded">
                <AvatarImage
                  src={activeTeam?.avatarUrl || undefined}
                  alt={activeTeam?.name}
                />
                <AvatarFallback variant="primary" className="text-[9px]">
                  {activeTeam?.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* User Avatar Overlay - bigger */}
              <div className="absolute -right-0.5 -bottom-0.5 rounded-full border border-white">
                <Avatar size="sm" shape="circle" className="h-4 w-4">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback variant="primary" className="text-[7px]">
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width]"
          align="start"
          side="top"
          sideOffset={4}
        >
          {/* User Section */}
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar size="sm" shape="circle">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                <AvatarFallback variant="primary">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left">
                <span className="text-body-medium-sm truncate font-semibold text-[var(--color-text-primary)]">
                  {user.name}
                </span>
                <span className="text-caption-xsm truncate text-[var(--color-text-secondary)]">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Team Section */}
          <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-[var(--color-text-tertiary)]">
            Organizations
          </DropdownMenuLabel>
          {teams.map((team) => (
            <DropdownMenuItem
              key={team._id}
              onClick={() => setActiveTeam(team)}
              className="mx-1 mb-1 h-10 cursor-pointer gap-2 px-1 pr-2 pl-1"
            >
              <Avatar size="sm" shape="rounded">
                <AvatarImage src={team.avatarUrl || undefined} alt={team.name} />
                <AvatarFallback variant="primary" className="text-[8px]">
                  {team.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-body-medium-sm truncate font-semibold text-[var(--color-text-primary)]">
                  {team.name}
                </span>
                <span className="text-caption-xsm truncate text-[var(--color-text-secondary)]">
                  {team.role} • {team.plan} plan
                </span>
              </div>
              {activeTeam?._id === team._id && <Icon name="check" size="md" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Action Items */}
          <DropdownMenuItem
            onClick={() => navigate("/user-profile")}
            className="cursor-pointer flex items-center gap-2"
          >
            <Icon name="user" size="sm" />
            <span>User profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/organization-settings")}
            className="cursor-pointer flex items-center gap-2"
          >
            <Icon name="settings" size="sm" />
            <span>Organization settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              // Add logout logic here
              localStorage.removeItem("userEmail");
              navigate("/");
            }}
            className="cursor-pointer flex items-center gap-2"
            destructive
          >
            <Icon name="log-out" size="sm" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// App Frame Component
interface AppFrameProps {
  children: React.ReactNode;
}

// Sidebar Toggle with Tooltip Component
function SidebarToggleWithTooltip() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "[") {
        e.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <SidebarTrigger className="-ml-1" />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="flex items-center gap-2">
          <span>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          <Kbd size="sm" variant="dark">
            [
          </Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function AppFrame({ children }: AppFrameProps) {
  const location = useLocation();

  // Show login page without sidebar
  if (location.pathname === "/") {
    return <main className="h-full">{children}</main>;
  }

  return (
    <SidebarProvider className="h-full [&>div]:!block" defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-[var(--space-md)]">
            <SidebarToggleWithTooltip />
            <Separator layout="horizontal" className="mr-2 h-4" />
            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList className="flex-nowrap">
                <DynamicBreadcrumbs />
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-[var(--space-md)] p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
