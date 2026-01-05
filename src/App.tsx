import { Outlet, useLocation, useNavigate } from "react-router";
import * as React from "react";
import { AppFrame, Spinner } from "@rafal.lemieszewski/tide-ui";
import { UserProvider } from "./contexts/UserContext";
import { HeaderActionsProvider, HeaderActionsContext } from "./contexts/HeaderActionsContext";
import { useAppFrameData } from "./hooks";
import { HeaderContent } from "./components/HeaderContent";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(HeaderActionsContext);
  const { navigationData, user, teams, isLoading } = useAppFrameData();

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
        <Spinner size="lg" variant="primary" showLabel loadingText="Loading..." />
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
      onNavigate={(url) => {
        console.log("AppFrame onNavigate called with URL:", url);

        // Intercept Tide-UI's hardcoded user menu URLs
        if (url === "/user/profile" || url === "user/profile") {
          console.log("Intercepting user profile URL, navigating to user-profile page");
          navigate("/user-profile");
          return;
        }

        if (url === "/organization/settings" || url === "organization/settings") {
          console.log("Intercepting organization settings URL, navigating to organization-settings page");
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
    <UserProvider>
      <HeaderActionsProvider>
        <AppContent />
      </HeaderActionsProvider>
    </UserProvider>
  );
}

export default App;
