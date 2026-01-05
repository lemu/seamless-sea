import { useEffect, useState } from "react";
import { Spinner } from "@rafal.lemieszewski/tide-ui";
import { authClient } from "../lib/auth-client";

function SignOut() {
  const [status, setStatus] = useState<"signing-out" | "redirecting">("signing-out");

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await authClient.signOut();
        setStatus("redirecting");
        // Small delay to show "Redirecting..." before full page reload
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.error("SignOut error:", err);
      }
      // Use full page reload to ensure clean auth state
      window.location.replace("/");
    };

    performSignOut();
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <Spinner
        size="lg"
        variant="primary"
        showLabel
        loadingText={status === "signing-out" ? "Signing out..." : "Redirecting..."}
      />
    </div>
  );
}

export default SignOut;
