import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import Login from "./routes/Login.tsx";
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
import Boards from "./routes/Boards.tsx";
import BoardDetail from "./routes/BoardDetail.tsx";
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
        handle: {
          crumb: () => "Home"
        }
      },
      // Management routes
      {
        path: "freight-planner",
        element: <FreightPlanner />,
        handle: {
          crumb: () => "Freight planner"
        }
      },
      {
        path: "trade-desk",
        element: <TradeDesk />,
        handle: {
          crumb: () => "Trade desk",
          redirectOnly: true // Mark this as a redirect-only route
        },
        children: [
          {
            index: true,
            element: <Navigate to="new-order" replace />
          },
          {
            path: "new-order",
            element: <NewOrder />,
            handle: {
              crumb: () => "New order"
            }
          },
          {
            path: "mailing-list",
            element: <MailingList />,
            handle: {
              crumb: () => "Mailing list"
            }
          }
        ]
      },
      {
        path: "contracts",
        element: <Contracts />,
        handle: {
          crumb: () => "Contracts"
        }
      },
      {
        path: "compliance",
        element: <Compliance />,
        handle: {
          crumb: () => "Compliance"
        }
      },
      // Intelligence routes
      {
        path: "global-market",
        element: <GlobalMarket />,
        handle: {
          crumb: () => "Global market"
        }
      },
      {
        path: "assets",
        element: <Assets />,
        handle: {
          crumb: () => "Assets"
        }
      },
      {
        path: "fixtures",
        element: <Fixtures />,
        handle: {
          crumb: () => "Fixtures"
        }
      },
      // Support routes
      {
        path: "notifications",
        element: <Notifications />,
        handle: {
          crumb: () => "Notifications"
        }
      },
      {
        path: "help-support",
        element: <HelpSupport />,
        handle: {
          crumb: () => "Help & support"
        }
      },
      // Boards routes
      {
        path: "boards",
        element: <Boards />,
        handle: {
          crumb: () => "Boards"
        },
        children: [
          {
            path: ":id",
            element: <BoardDetail />,
            handle: {
              crumb: (match: any) => {
                // Try to get board title from the match data or params
                const boardId = match.params?.id;
                // For now, we'll handle dynamic loading in the breadcrumb component
                return boardId ? `Board ${boardId}` : "Board";
              }
            }
          }
        ]
      },
      // User routes
      {
        path: "user-profile",
        element: <UserProfile />,
        handle: {
          crumb: () => "User Profile"
        }
      },
      {
        path: "organization-settings",
        element: <OrganizationSettings />,
        handle: {
          crumb: () => "Organization Settings"
        }
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
