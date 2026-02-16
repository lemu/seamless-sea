import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { Button, Input, Card, CardHeader, CardContent, Spinner } from "@rafal.lemieszewski/tide-ui";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../lib/auth-client";

function SignUpPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const navigate = useNavigate();

  const invitation = useQuery(
    api.invitations.getInvitationByToken,
    inviteToken ? { token: inviteToken } : "skip"
  );

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasInvite = !!inviteToken;
  const inviteEmail = invitation?.email ?? "";
  const isFormEnabled = hasInvite && invitation?.status === "pending";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormEnabled || !inviteToken) return;

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        email: inviteEmail,
        password,
        name: name.trim(),
      });

      if (result.error) {
        setError(result.error.message ?? "Failed to create account. Please try again.");
        return;
      }

      // Redirect to accept invitation with auto-accept
      navigate(`/invite/${inviteToken}?auto=1`);
    } catch (err) {
      console.error("Sign-up error:", err);
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading invitation details
  if (hasInvite && invitation === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" variant="primary" />
              <p className="text-text-secondary">Loading invitation…</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation is invalid or already used
  if (hasInvite && invitation && invitation.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">
              {invitation.status === "accepted" ? "Invitation Already Accepted" : "Invitation Unavailable"}
            </h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary text-center">
              {invitation.status === "accepted"
                ? "This invitation has already been accepted. Try signing in instead."
                : invitation.status === "revoked"
                  ? "This invitation has been revoked. Please contact the organization admin."
                  : "This invitation has expired. Please contact the organization admin for a new one."}
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Create Account</h1>
          {isFormEnabled && invitation?.organizationName ? (
            <p className="text-sm text-text-secondary text-center mt-2">
              Join <strong>{invitation.organizationName}</strong> as a <strong>{invitation.role}</strong>
            </p>
          ) : (
            <p className="text-sm text-text-secondary text-center mt-2">
              Invitation required
            </p>
          )}
          {!hasInvite && (
            <div className="mt-3 p-3 bg-[var(--color-warning-surface)] border border-[var(--color-warning-border)] rounded-md">
              <p className="text-sm text-[var(--color-warning-text)] text-center">
                Sign up is by invitation only. Please request an invitation from your administrator.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={!isFormEnabled || isSubmitting}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                readOnly
                required
                disabled={!isFormEnabled}
                autoComplete="email"
              />
              {isFormEnabled && (
                <p className="text-xs text-text-secondary mt-1">
                  Set by invitation — cannot be changed
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={!isFormEnabled || isSubmitting}
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                disabled={!isFormEnabled || isSubmitting}
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!isFormEnabled || isSubmitting}
            >
              {isSubmitting ? "Creating Account…" : "Create Account"}
            </Button>

            <p className="text-sm text-center text-text-secondary">
              Already have an account?{" "}
              <Link to="/" className="text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignUpPage;
