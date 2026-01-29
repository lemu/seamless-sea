import { useState } from "react";
import { Link } from "react-router";
import { Button, Input, Card, CardHeader, CardContent } from "@rafal.lemieszewski/tide-ui";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../lib/auth-client";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const requestPasswordReset = useAction(api.passwordReset.requestPasswordReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Store email in localStorage for auto sign-in after reset
      // (localStorage persists across tabs, unlike sessionStorage)
      localStorage.setItem("password_reset_email", email);

      // Try Better Auth's native password reset first
      // This will work for users who already exist in Better Auth
      const betterAuthResult = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // If Better Auth handled it (no error), we're done
      // Better Auth doesn't tell us if the user exists (for security), so we also
      // try our custom system for users who might only exist in the old users table
      if (!betterAuthResult.error) {
        // Also try our custom system for migration users
        // This ensures users not yet in Better Auth also get an email
        try {
          await requestPasswordReset({ email });
        } catch {
          // Ignore errors - Better Auth might have already handled it
        }
      } else {
        // Better Auth failed, try our custom system
        await requestPasswordReset({ email });
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("Password reset request error:", err);
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Check Your Email</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--color-text-secondary)] text-center">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            </p>
            <p className="text-[var(--color-text-secondary)] text-center text-sm">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <div className="pt-4">
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
          <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                autoComplete="email"
                autoFocus
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
              {isLoading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
