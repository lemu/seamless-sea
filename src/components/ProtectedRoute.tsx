import { Navigate, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Spinner } from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { user, isLoading: convexLoading } = useUser();
  const location = useLocation();

  // Show loading while Clerk or Convex data loads
  if (!clerkLoaded || convexLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner size="lg" variant="primary" showLabel loadingText="Loading..." />
      </div>
    );
  }

  // Redirect to login if not authenticated with Clerk or no Convex user
  if (!isSignedIn || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}
