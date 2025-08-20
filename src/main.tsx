import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import Login from "./routes/Login.tsx";
import About from "./routes/About.tsx";
import Home from "./routes/Home.tsx";
import FreightPlanner from "./routes/FreightPlanner.tsx";
import TradeDesk from "./routes/TradeDesk.tsx";
import NewOrder from "./routes/NewOrder.tsx";
import MailingList from "./routes/MailingList.tsx";
import Contracts from "./routes/Contracts.tsx";
import Compliance from "./routes/Compliance.tsx";
import GlobalMarket from "./routes/GlobalMarket.tsx";
import Assets from "./routes/Assets.tsx";
import Fixtures from "./routes/Fixtures.tsx";
import Notifications from "./routes/Notifications.tsx";
import HelpSupport from "./routes/HelpSupport.tsx";
import UserProfile from "./routes/UserProfile.tsx";
import OrganizationSettings from "./routes/OrganizationSettings.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Login />,
      },
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      // Management routes
      {
        path: "freight-planner",
        element: <FreightPlanner />,
      },
      {
        path: "trade-desk",
        element: <TradeDesk />,
      },
      {
        path: "new-order",
        element: <NewOrder />,
      },
      {
        path: "mailing-list",
        element: <MailingList />,
      },
      {
        path: "contracts",
        element: <Contracts />,
      },
      {
        path: "compliance",
        element: <Compliance />,
      },
      // Intelligence routes
      {
        path: "global-market",
        element: <GlobalMarket />,
      },
      {
        path: "assets",
        element: <Assets />,
      },
      {
        path: "fixtures",
        element: <Fixtures />,
      },
      // Support routes
      {
        path: "notifications",
        element: <Notifications />,
      },
      {
        path: "help-support",
        element: <HelpSupport />,
      },
      // User routes
      {
        path: "user-profile",
        element: <UserProfile />,
      },
      {
        path: "organization-settings",
        element: <OrganizationSettings />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexProvider>
  </StrictMode>,
);
