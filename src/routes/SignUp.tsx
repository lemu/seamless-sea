import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button, Input, Card, CardHeader, CardContent } from "@rafal.lemieszewski/tide-ui";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "../hooks";

function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useMutation(api.auth.signUp);
  const { setAuthToken } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      // Create account with bcrypt auth
      const result = await signUp({
        name,
        email,
        password,
      });

      // Store session token and update context
      setAuthToken(result.session.token);

      // Navigate to home
      navigate("/home");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Create Account</h1>
          <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2">
            Join SeamlessSea today
          </p>
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
                disabled={isLoading}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
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
                disabled={isLoading}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            <p className="text-sm text-center text-[var(--color-text-secondary)]">
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
