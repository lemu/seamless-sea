import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button, Input, Card, CardHeader, CardContent } from "@rafal.lemieszewski/tide-ui";
import { authClient } from "../lib/auth-client";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Invalid email or password");
      }

      // Navigate to home
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Invalid email or password");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Sign In</h1>
          <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2">
            Welcome back to SeamlessSea
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
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
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
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-sm text-center text-[var(--color-text-secondary)]">
              Don't have an account?{" "}
              <Link to="/sign-up" className="text-[var(--color-primary)] hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
