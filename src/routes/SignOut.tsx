import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Spinner } from "@rafal.lemieszewski/tide-ui";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function SignOut() {
  const navigate = useNavigate();
  const signOut = useMutation(api.auth.signOut);

  useEffect(() => {
    const performSignOut = async () => {
      const token = localStorage.getItem('session_token');
      if (token) {
        try {
          await signOut({ token });
        } catch (err) {
          console.error("SignOut error:", err);
        }
      }
      localStorage.removeItem('session_token');
      navigate("/", { replace: true });
    };

    performSignOut();
  }, [signOut, navigate]);

  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size="lg" variant="primary" showLabel loadingText="Signing out..." />
    </div>
  );
}

export default SignOut;
