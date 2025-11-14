import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button, Input } from "@rafal.lemieszewski/tide-ui";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setSessionToken } from "../lib/auth-client";

type AuthMode = "signIn" | "signUp" | "setPassword";

function Login() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailToCheck, setEmailToCheck] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const signUpMutation = useMutation(api.auth.signUp);
  const signInMutation = useMutation(api.auth.signIn);
  const setPasswordMutation = useMutation(api.auth.setPasswordForExistingUser);

  // Check if user exists when they blur the email field in sign-in mode
  const userCheck = useQuery(
    api.auth.checkUserExists,
    emailToCheck && mode === "signIn" ? { email: emailToCheck } : "skip"
  );

  const handleEmailBlur = () => {
    if (mode === "signIn" && email && email.includes("@")) {
      setEmailToCheck(email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "signUp") {
        // Sign up flow
        if (!name.trim()) {
          setError("Please enter your name");
          setIsLoading(false);
          return;
        }

        const result = await signUpMutation({
          email,
          password,
          name: name.trim(),
        });

        // Store the session token
        setSessionToken(result.session.token);

        // Successfully signed up
        navigate("/home");
      } else if (mode === "setPassword") {
        // Set password for existing user
        const result = await setPasswordMutation({
          email,
          password,
        });

        // Store the session token
        setSessionToken(result.session.token);

        // Successfully set password and signed in
        navigate("/home");
      } else {
        // Sign in flow
        const result = await signInMutation({
          email,
          password,
        });

        // Store the session token
        setSessionToken(result.session.token);

        // Successfully signed in
        navigate("/home");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      if (err instanceof Error) {
        // Check if error is about missing password
        if (err.message.includes("set up your password")) {
          setMode("setPassword");
          setError("Please set a password for your account");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setName("");
    setPassword("");
    setEmailToCheck("");
  };

  // Auto-switch to setPassword mode if user exists without password
  useEffect(() => {
    if (userCheck && userCheck.exists && !userCheck.hasPassword && mode === "signIn") {
      setMode("setPassword");
      setName(userCheck.name || "");
      setError("");
    }
  }, [userCheck, mode]);

  const getTitle = () => {
    switch (mode) {
      case "signUp":
        return "Create Account";
      case "setPassword":
        return "Set Your Password";
      default:
        return "Sign In";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "signUp":
        return "Create a new account to get started";
      case "setPassword":
        return "Welcome back! Please set a password for your account";
      default:
        return "Sign in to your account";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
            {getTitle()}
          </h1>
          <p className="text-body-md mt-2 text-[var(--color-text-secondary)]">
            {getDescription()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "signUp" && (
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
                required
              />
            </div>
          )}

          {mode === "setPassword" && name && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                Setting password for: <strong>{name}</strong> ({email})
              </p>
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
              onBlur={handleEmailBlur}
              disabled={isLoading || mode === "setPassword"}
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
              placeholder={
                mode === "signUp" || mode === "setPassword"
                  ? "Create a password (min 8 characters)"
                  : "Enter your password"
              }
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
              ? mode === "signUp"
                ? "Creating account…"
                : mode === "setPassword"
                  ? "Setting password…"
                  : "Signing in…"
              : mode === "signUp"
                ? "Create Account"
                : mode === "setPassword"
                  ? "Set Password & Sign In"
                  : "Sign In"}
          </Button>

          {mode !== "setPassword" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode(mode === "signUp" ? "signIn" : "signUp")}
                disabled={isLoading}
                className="text-sm text-[var(--color-text-link)] hover:text-[var(--color-text-link-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === "signUp"
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          )}

          {mode === "setPassword" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode("signIn")}
                disabled={isLoading}
                className="text-sm text-[var(--color-text-link)] hover:text-[var(--color-text-link-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use a different email
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
