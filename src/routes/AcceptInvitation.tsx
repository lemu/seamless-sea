import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router";
import { Button, Card, CardHeader, CardContent, Spinner } from "@rafal.lemieszewski/tide-ui";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../hooks";

function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const autoAccept = searchParams.get("auto") === "1";
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useUser();

  const [error, setError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const hasAutoAccepted = useRef(false);

  // Get invitation details
  const invitation = useQuery(
    api.invitations.getInvitationByToken,
    token ? { token } : "skip"
  );

  const acceptInvitation = useMutation(api.invitations.acceptInvitation);
  const acceptInvitationByEmail = useMutation(api.invitations.acceptInvitationByEmail);

  // Auto-accept invitation when coming from signup (?auto=1)
  useEffect(() => {
    if (
      autoAccept &&
      !hasAutoAccepted.current &&
      user?.email &&
      token &&
      invitation?.status === "pending" &&
      !isAccepting &&
      !isSuccess
    ) {
      hasAutoAccepted.current = true;
      performAccept();
    }
  }, [autoAccept, user, token, invitation, isAccepting, isSuccess]);

  const performAccept = async () => {
    if (!token || !user?.email) return;

    setError("");
    setIsAccepting(true);

    try {
      // Use the appropriate mutation based on whether we have a users table ID
      const result = user._id
        ? await acceptInvitation({
            token,
            userId: user._id,
          })
        : await acceptInvitationByEmail({
            token,
            email: user.email,
            name: user.name,
          });

      if (result.alreadyMember) {
        navigate("/home");
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Accept invitation error:", err);
      setError(err instanceof Error ? err.message : "Failed to accept invitation. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleAccept = () => {
    performAccept();
  };

  // Show loading while checking invitation or user
  if (invitation === undefined || isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" variant="primary" />
              <p className="text-[var(--color-text-secondary)]">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if invitation is invalid
  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Invalid Invitation</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              This invitation link is invalid or does not exist.
            </p>
            <div className="pt-4">
              <Link to="/">
                <Button variant="primary" className="w-full">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message (check BEFORE status check to avoid race condition)
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Welcome to {invitation.organizationName}!</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              You've successfully joined as a <strong>{invitation.role}</strong>.
            </p>
            <div className="pt-4">
              <Button variant="primary" className="w-full" onClick={() => navigate("/home")}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check invitation status
  if (invitation.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">
              {invitation.status === "accepted" ? "Invitation Already Accepted" : "Invitation Expired"}
            </h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              {invitation.status === "accepted"
                ? "This invitation has already been accepted."
                : invitation.status === "revoked"
                  ? "This invitation has been revoked."
                  : "This invitation has expired. Please contact the organization admin for a new invitation."}
            </p>
            <div className="pt-4">
              <Link to={user ? "/home" : "/"}>
                <Button variant="primary" className="w-full">
                  {user ? "Go to Home" : "Go to Sign In"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation has expired
  if (Date.now() > invitation.expiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Invitation Expired</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              This invitation has expired. Please contact the organization admin for a new invitation.
            </p>
            <div className="pt-4">
              <Link to={user ? "/home" : "/"}>
                <Button variant="primary" className="w-full">
                  {user ? "Go to Home" : "Go to Sign In"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is not logged in, redirect to sign up with invite token
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">You're Invited!</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              You've been invited to join <strong>{invitation.organizationName}</strong> as a{" "}
              <strong>{invitation.role}</strong>.
            </p>
            <p className="text-[var(--color-text-secondary)] text-center text-sm">
              Create an account to join the organization.
            </p>
            <div className="pt-4">
              <Link to={`/sign-up?invite=${token}`}>
                <Button variant="primary" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in, show accept confirmation
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Accept Invitation</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[var(--color-text-secondary)] text-center">
            You've been invited to join <strong>{invitation.organizationName}</strong> as a{" "}
            <strong>{invitation.role}</strong>.
          </p>
          <p className="text-[var(--color-text-secondary)] text-center text-sm">
            Signed in as <strong>{user.email}</strong>
          </p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting || !user?.email}
            >
              {isAccepting ? "Accepting..." : "Accept Invitation"}
            </Button>
            <Link to="/auth/sign-out">
              <Button variant="secondary" className="w-full" disabled={isAccepting}>
                Decline
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AcceptInvitation;
