import { Navigate, useLocation } from "react-router";
import { useUser } from "../hooks";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const location = useLocation();

  // If still loading, don't redirect yet - let App.tsx show loading state
  if (isLoading) {
    return null;
  }

  // Redirect to root (AuthGate) if not authenticated
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}
