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

  return (
    <AppFrame
      navigationData={navigationData}
      user={user || undefined}
      teams={teams}
      defaultSidebarOpen={true}
      headerContent={<HeaderContent />}
      headerActions={context?.actions}
      onNavigate={(url) => navigate(url)}
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
