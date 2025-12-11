import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";
import { Spinner } from "@rafal.lemieszewski/tide-ui";

function SignOut() {
  const { signOut } = useClerk();

  useEffect(() => {
    const performSignOut = async () => {
      await signOut();
      window.location.href = "/";
    };

    performSignOut();
  }, [signOut]);

  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size="lg" variant="primary" showLabel loadingText="Signing out..." />
    </div>
  );
}

export default SignOut;
