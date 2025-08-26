import { Link } from "react-router";
import { Button } from "@rafal.lemieszewski/tide-ui";
import { TodoDemo } from "../components/TodoDemo";
import { ConvexStatus } from "../components/ConvexStatus";

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
          <Button variant="default">Back to Demo</Button>
        </Link>
      </div>
      <ConvexStatus />
      <TodoDemo />
    </div>
  );
}

export default Home;
