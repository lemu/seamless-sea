import { Link } from "react-router";
import { Button } from "@rafal.lemieszewski/tide-ui";

function Home() {
  return (
    <div className="space-y-6 p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">
            Seamless Sea
          </h1>
          <p className="text-body-lg text-[var(--color-text-secondary)]">
            React Router 7 + Convex + Tide UI showcase application
          </p>
        </div>
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
