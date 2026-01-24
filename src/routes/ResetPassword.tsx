import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router";
import { Button, Input, Card, CardHeader, CardContent, Spinner } from "@rafal.lemieszewski/tide-ui";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../lib/auth-client";

function ResetPassword() {
  const { token: routeToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token");
  const navigate = useNavigate();

  // Determine which token type we have
  const isBetterAuthToken = !!queryToken;
  const customToken = routeToken;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get stored email from password reset request (for auto sign-in)
  // localStorage persists across tabs, unlike sessionStorage
  const storedEmail = localStorage.getItem("password_reset_email");

  // For Better Auth tokens, we don't need to verify - Better Auth handles it
  // For custom tokens, verify and get user info
  const tokenVerification = useQuery(
    api.passwordReset.verifyResetToken,
    customToken && !isBetterAuthToken ? { token: customToken } : "skip"
  );

  const markTokenUsed = useMutation(api.passwordReset.markTokenUsed);

  // Get user name for Better Auth signup (only for custom tokens)
  const userData = useQuery(
    api.users.getUserByEmail,
    tokenVerification?.valid && tokenVerification?.email
      ? { email: tokenVerification.email }
      : "skip"
  );


  // Handle password reset
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Handle Better Auth tokens (from query param)
      if (isBetterAuthToken && queryToken) {
        const result = await authClient.resetPassword({
          newPassword: password,
          token: queryToken,
        });

        if (result.error) {
          throw new Error(result.error.message || "Failed to reset password");
        }

        // Password reset successful - try auto sign-in if we have stored email
        if (storedEmail) {
          await authClient.signIn.email({
            email: storedEmail,
            password,
          });

          // Clear stored email
          localStorage.removeItem("password_reset_email");

          // Redirect to home - the session should be established
          // If sign-in failed, ProtectedRoute will redirect to login
          window.location.href = "/home";
          return;
        }

        // No stored email - show success message
        setIsSuccess(true);
        return;
      }

      // Handle our custom tokens (from route param) - for migration users
      if (!customToken || !tokenVerification?.valid || !tokenVerification?.email) {
        setError("Invalid or expired reset token");
        setIsLoading(false);
        return;
      }

      // Try to sign up with Better Auth - this "migrates" users from old bcrypt system
      const signupResult = await authClient.signUp.email({
        name: userData?.name || tokenVerification.email.split("@")[0],
        email: tokenVerification.email,
        password,
      });

      if (signupResult.error) {
        // User already exists in Better Auth
        if (signupResult.error.message?.includes("already exists") ||
            signupResult.error.code === "USER_ALREADY_EXISTS") {
          setError(
            "Your account already exists. Please use the 'Forgot Password' link on the Sign In page - you'll receive an email to reset your password."
          );
          setIsLoading(false);
          return;
        }
        throw new Error(signupResult.error.message || "Failed to reset password");
      }

      // Mark our token as used
      await markTokenUsed({ token: customToken });

      setIsSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset password. Please try again or contact support."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // For custom tokens: Show loading while verifying
  if (!isBetterAuthToken && customToken && tokenVerification === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" variant="primary" />
              <p className="text-[var(--color-text-secondary)]">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For custom tokens: Show error if token is invalid
  if (!isBetterAuthToken && customToken && !tokenVerification?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Invalid Reset Link</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              {tokenVerification?.error || "This password reset link is invalid or has expired."}
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/forgot-password">
                <Button variant="primary" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/">
                <Button variant="secondary" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token at all
  if (!isBetterAuthToken && !customToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Invalid Reset Link</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              No reset token found. Please request a new password reset link.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/forgot-password">
                <Button variant="primary" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/">
                <Button variant="secondary" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Password Reset Successful</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              Your password has been successfully reset. Please sign in with your new password.
            </p>
            <div className="pt-4">
              <Button variant="primary" className="w-full" onClick={() => navigate("/")}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine email to display (from verification or stored)
  const displayEmail = tokenVerification?.email || storedEmail;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Reset Your Password</h1>
          <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2">
            {displayEmail ? (
              <>Enter a new password for <strong>{displayEmail}</strong></>
            ) : (
              <>Enter a new password for your account</>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={8}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                disabled={isLoading}
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
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <p className="text-sm text-center text-[var(--color-text-secondary)]">
              Remember your password?{" "}
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

export default ResetPassword;
