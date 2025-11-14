import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Input } from "@rafal.lemieszewski/tide-ui";
import { signIn, signUp } from "../lib/auth-client";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        if (!name.trim()) {
          setError("Please enter your name");
          setIsLoading(false);
          return;
        }

        const result = await signUp.email({
          email,
          password,
          name: name.trim(),
        });

        if (result.error) {
          setError(result.error.message || "Failed to create account");
        } else {
          // Successfully signed up
          navigate("/home");
        }
      } else {
        // Sign in flow
        const result = await signIn.email({
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message || "Invalid email or password");
        } else {
          // Successfully signed in
          navigate("/home");
        }
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setName("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-body-md mt-2 text-[var(--color-text-secondary)]">
            {isSignUp
              ? "Create a new account to get started"
              : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
              >
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder={isSignUp ? "Create a password (min 8 characters)" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading
              ? isSignUp
                ? "Creating account…"
                : "Signing in…"
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-sm text-[var(--color-text-link)] hover:text-[var(--color-text-link-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Create one"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
