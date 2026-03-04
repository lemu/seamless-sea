import { Outlet, useLocation, useNavigate } from "react-router";
import * as React from "react";
import { useState, useMemo } from "react";
import { AppFrame, Spinner, Toaster, TooltipProvider } from "@rafal.lemieszewski/tide-ui";
import { Ship, LayoutDashboard } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { UserProvider } from "./contexts/UserContext";
import { HeaderActionsProvider, HeaderActionsContext } from "./contexts/HeaderActionsContext";
import { useAppFrameData, useUser } from "./hooks";
import { HeaderContent } from "./components/HeaderContent";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(HeaderActionsContext);
  const { navigationData, user, teams, currentOrganization, isLoading } = useAppFrameData();
  const { user: authUser } = useUser();

  const vessels = useQuery(api.vessels.list);
  const myBoards = useQuery(
    api.boards.getBoardsByUserAndOrg,
    authUser?._id && currentOrganization?._id
      ? { userId: authUser._id, organizationId: currentOrganization._id }
      : "skip",
  );
  const sharedBoards = useQuery(
    api.boards.getBoardsSharedWithOrg,
    authUser?._id && currentOrganization?._id
      ? { userId: authUser._id, organizationId: currentOrganization._id }
      : "skip",
  );
  const allBoards = [...(myBoards ?? []), ...(sharedBoards ?? [])];

  const [searchQuery, setSearchQuery] = useState("");

  const searchItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const matches = (...texts: (string | undefined)[]) =>
      texts.some(t => t?.toLowerCase().includes(q));

    return [
      ...(vessels ?? [])
        .filter(v => matches(v.name, v.imoNumber, v.vesselClass))
        .map(v => ({
          id: v._id,
          label: v.name,
          group: "Vessels",
          icon: Ship,
          onSelect: () => navigate(`/assets/vessels/${v._id}`),
        })),
      ...allBoards
        .filter(b => matches(b.title))
        .map(b => ({
          id: b._id,
          label: b.title,
          group: "Boards",
          icon: LayoutDashboard,
          onSelect: () => navigate(`/boards/${b._id}`),
        })),
    ];
  }, [searchQuery, vessels, allBoards, navigate]);

  // Show auth pages without AppFrame (login, signup, sign-out, password reset, invitations)
  const isAuthPage = ["/", "/sign-up", "/auth/sign-out", "/test", "/forgot-password", "/reset-password"].includes(location.pathname) ||
    location.pathname.startsWith("/reset-password/") ||
    location.pathname.startsWith("/invite/");
  if (isAuthPage) {
    return <main className="h-full"><Outlet /></main>;
  }

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="l" variant="primary" showLabel loadingText="Loading..." />
      </div>
    );
  }

  // Prepare teams data with proper formatting
  const formattedTeams = (teams || [])
    .filter(team => team && team._id && team.name)
    .map(team => ({
      _id: String(team._id),
      name: team.name || "Unknown Team",
      role: team.role || "Member",
      plan: team.plan || "Free",
      avatarUrl: team.avatarUrl || undefined,
    }));

  return (
    <AppFrame
      navigationData={navigationData}
      user={user ? {
        name: user.name || "Unknown User",
        email: user.email || "",
        avatarUrl: user.avatarUrl || undefined,
      } : undefined}
      {...(formattedTeams.length > 0 && { teams: formattedTeams })}
      defaultSidebarOpen={true}
      headerContent={<HeaderContent />}
      headerActions={context?.actions}
      headerTabs={context?.tabs}
      onSearchChange={setSearchQuery}
      searchItems={searchItems}
      onNavigate={(url) => {
        // Intercept Tide-UI's hardcoded user menu URLs
        if (url === "/user/profile" || url === "user/profile") {
          navigate("/user-profile");
          return;
        }

        if (url === "/organization/settings" || url === "organization/settings") {
          navigate("/organization-settings");
          return;
        }

        navigate(url);
      }}
    >
      <Outlet />
    </AppFrame>
  );
}

function App() {
  return (
    <TooltipProvider delayDuration={400}>
      <UserProvider>
        <HeaderActionsProvider>
          <AppContent />
          <Toaster position="bottom-right" />
        </HeaderActionsProvider>
      </UserProvider>
    </TooltipProvider>
  );
}

export default App;
