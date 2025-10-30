import { Link } from "react-router";
import { Button } from "@rafal.lemieszewski/tide-ui";

function Home() {
  return (
    <div className="m-6 space-y-6 overflow-x-hidden max-w-full min-w-0" style={{ padding: 'var(--page-padding)' }}>
      {/* Header with Title */}
      <div className="flex items-center justify-between gap-4 min-w-0 overflow-hidden">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)] shrink-0">
          Seamless Sea
        </h1>
        <Link to="/">
          <Button variant="default">Back to Login</Button>
        </Link>
      </div>

      <div className="py-8 text-center">
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Welcome to Seamless Sea! Your application is running successfully.
        </p>
      </div>
    </div>
  );
}

export default Home;
