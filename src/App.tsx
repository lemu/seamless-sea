import { Outlet, useLocation, useNavigate } from "react-router";
import * as React from "react";
import { AppFrame, Spinner } from "@rafal.lemieszewski/tide-ui";
import { UserProfile } from "@clerk/clerk-react";
import { UserProvider } from "./contexts/UserContext";
import { HeaderActionsProvider, HeaderActionsContext } from "./contexts/HeaderActionsContext";
import { useAppFrameData } from "./hooks";
import { HeaderContent } from "./components/HeaderContent";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(HeaderActionsContext);
  const { navigationData, user, teams, isLoading } = useAppFrameData();
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  // Clerk authentication handlers
  const handleUserProfileClick = () => {
    console.log("Opening Clerk profile modal");
    // Remove focus after current event loop completes
    requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    // Close any open menus with ESC key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    // Wait for menu to close, then open modal
    setTimeout(() => {
      setShowProfileModal(true);
    }, 150);
  };

  // Show login page without AppFrame
  if (location.pathname === "/") {
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
      name: team.name,
      role: team.role || "Member",
      plan: team.plan || "Free",
      avatarUrl: team.avatarUrl || null,
    }));

  return (
    <AppFrame
      navigationData={navigationData}
      user={user ? {
        _id: String(user._id),
        name: user.name || "Unknown User",
        email: user.email || "",
        avatarUrl: user.avatarUrl || null,
      } : undefined}
      {...(formattedTeams.length > 0 && { teams: formattedTeams })}
      defaultSidebarOpen={true}
      headerContent={<HeaderContent />}
      headerActions={context?.actions}
      onNavigate={(url) => {
        console.log("AppFrame onNavigate called with URL:", url);

        // Intercept Tide-UI's hardcoded user menu URLs
        if (url === "/user/profile" || url === "user/profile") {
          console.log("Intercepting user profile URL, opening modal");
          // Remove focus after current event loop completes
          requestAnimationFrame(() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          });
          // Close any open menus with ESC key
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
          // Wait for menu to close, then open modal
          setTimeout(() => {
            setShowProfileModal(true);
          }, 150);
          return;
        }

        if (url === "/organization/settings" || url === "organization/settings") {
          console.log("Intercepting organization settings URL, redirecting to organization-settings");
          // Remove focus after current event loop completes
          requestAnimationFrame(() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          });
          // Close any open menus with ESC key
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
          navigate("/organization-settings");
          return;
        }

        navigate(url);
      }}
      onUserProfileClick={handleUserProfileClick}
    >
      <Outlet />
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowProfileModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <UserProfile />
          </div>
        </div>
      )}
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
