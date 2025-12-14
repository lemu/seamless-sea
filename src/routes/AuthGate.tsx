import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Spinner } from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import Login from "./Login";

/**
 * AuthGate - Entry point that checks authentication
 * Shows fullscreen loading, then either redirects to /home or shows login
 */
function AuthGate() {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();

  useEffect(() => {
    // Once loaded, if user is authenticated, redirect to home
    if (!isLoading && user) {
      navigate("/home", { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Show fullscreen loading while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-surface-secondary)]">
        <Spinner size="lg" variant="primary" showLabel loadingText="Loading..." />
      </div>
    );
  }

  // If not authenticated, show login form
  if (!user) {
    return <Login />;
  }

  // During redirect (authenticated but haven't redirected yet)
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-surface-secondary)]">
      <Spinner size="lg" variant="primary" showLabel loadingText="Loading..." />
    </div>
  );
}

export default AuthGate;
