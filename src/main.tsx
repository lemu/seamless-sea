import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import AuthGate from "./routes/AuthGate.tsx";
import SignUpPage from "./routes/SignUp.tsx";
import SignOut from "./routes/SignOut.tsx";
import Home from "./routes/Home.tsx";
import FreightPlanner from "./routes/FreightPlanner.tsx";
import TradeDesk from "./routes/TradeDesk.tsx";
import Recaps from "./routes/Recaps.tsx";
import AgreementContracts from "./routes/AgreementContracts.tsx";
import ClauseLibrary from "./routes/ClauseLibrary.tsx";
import Compliance from "./routes/Compliance.tsx";
import GlobalMarket from "./routes/GlobalMarket.tsx";
import Assets from "./routes/Assets.tsx";
import Fixtures from "./routes/Fixtures.tsx";
import SeaNet from "./routes/SeaNet.tsx";
import Notifications from "./routes/Notifications.tsx";
import HelpSupport from "./routes/HelpSupport.tsx";
import Boards from "./routes/Boards.tsx";
import BoardDetail from "./routes/BoardDetail.tsx";
import UserProfile from "./routes/UserProfile.tsx";
import OrganizationSettings from "./routes/OrganizationSettings.tsx";
import SimpleTest from "./routes/SimpleTest.tsx";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <AuthGate />,
      },
      {
        path: "sign-up",
        element: <SignUpPage />,
      },
      {
        path: "test",
        element: <SimpleTest />,
      },
      {
        path: "auth/sign-out",
        element: <SignOut />,
      },
      {
        path: "home",
        element: <ProtectedRoute><Home /></ProtectedRoute>,
        handle: {
          crumb: () => "Home",
        },
      },
      // Management routes
      {
        path: "freight-planner",
        element: <ProtectedRoute><FreightPlanner /></ProtectedRoute>,
        handle: {
          crumb: () => "Freight planner",
        },
      },
      {
        path: "trade-desk",
        element: <ProtectedRoute><TradeDesk /></ProtectedRoute>,
        handle: {
          crumb: () => "Trade desk",
        },
      },
      {
        path: "agreements",
        children: [
          {
            index: true,
            element: <Navigate to="/agreements/recaps" replace />,
          },
          {
            path: "recaps",
            element: <ProtectedRoute><Recaps /></ProtectedRoute>,
            handle: {
              crumb: () => "Recaps",
            },
          },
          {
            path: "contracts",
            element: <ProtectedRoute><AgreementContracts /></ProtectedRoute>,
            handle: {
              crumb: () => "Contracts",
            },
          },
          {
            path: "clause-library",
            element: <ProtectedRoute><ClauseLibrary /></ProtectedRoute>,
            handle: {
              crumb: () => "Clause library",
            },
          },
        ],
      },
      {
        path: "compliance",
        element: <ProtectedRoute><Compliance /></ProtectedRoute>,
        handle: {
          crumb: () => "Compliance",
        },
      },
      // Intelligence routes
      {
        path: "seanet",
        element: <ProtectedRoute><SeaNet /></ProtectedRoute>,
        handle: {
          crumb: () => "SeaNet",
        },
      },
      {
        path: "global-market",
        element: <ProtectedRoute><GlobalMarket /></ProtectedRoute>,
        handle: {
          crumb: () => "Global market",
        },
      },
      {
        path: "assets",
        element: <ProtectedRoute><Assets /></ProtectedRoute>,
        handle: {
          crumb: () => "Assets",
        },
      },
      {
        path: "fixtures",
        element: <ProtectedRoute><Fixtures /></ProtectedRoute>,
        handle: {
          crumb: () => "Fixtures",
        },
      },
      // Support routes
      {
        path: "notifications",
        element: <ProtectedRoute><Notifications /></ProtectedRoute>,
        handle: {
          crumb: () => "Notifications",
        },
      },
      {
        path: "help-support",
        element: <ProtectedRoute><HelpSupport /></ProtectedRoute>,
        handle: {
          crumb: () => "Help & support",
        },
      },
      // Boards routes
      {
        path: "boards",
        element: <ProtectedRoute><Boards /></ProtectedRoute>,
        handle: {
          crumb: () => "Boards",
        },
        children: [
          {
            path: ":id",
            element: <BoardDetail />,
            handle: {
              crumb: (match: { params?: { id?: string } }) => {
                // Try to get board title from the match data or params
                const boardId = match.params?.id;
                // For now, we'll handle dynamic loading in the breadcrumb component
                return boardId ? `Board ${boardId}` : "Board";
              },
            },
          },
        ],
      },
      // User routes
      {
        path: "user-profile",
        element: <ProtectedRoute><UserProfile /></ProtectedRoute>,
        handle: {
          crumb: () => "User Profile",
        },
      },
      {
        path: "organization-settings",
        element: <ProtectedRoute><OrganizationSettings /></ProtectedRoute>,
        handle: {
          crumb: () => "Organization Settings",
        },
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
