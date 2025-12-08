import { useEffect } from "react";
import { useNavigate } from "react-router";
import { SignUp, useAuth } from "@clerk/clerk-react";
import { Spinner } from "@rafal.lemieszewski/tide-ui";

function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/home");
    }
  }, [isSignedIn, isLoaded, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)]">
        <Spinner size="lg" variant="primary" showLabel loadingText="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)] p-6">
      <SignUp
        routing="hash"
        signInUrl="/"
        afterSignUpUrl="/home"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}

export default SignUpPage;
