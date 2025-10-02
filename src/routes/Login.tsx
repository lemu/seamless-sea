import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Input } from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";

function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    const success = await login(email);
    if (success) {
      navigate("/home");
    } else {
      setError("No user found with this email address");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
            Login
          </h1>
          <p className="text-body-md mt-2 text-[var(--color-text-secondary)]">
            Enter your email to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
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
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
