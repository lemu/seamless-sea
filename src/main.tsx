import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "./lib/auth-client";
import "./index.css";
import App from "./App.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import AuthGate from "./routes/AuthGate.tsx";
import SignUpPage from "./routes/SignUp.tsx";
import SignOut from "./routes/SignOut.tsx";
import ForgotPassword from "./routes/ForgotPassword.tsx";
import ResetPassword from "./routes/ResetPassword.tsx";
import AcceptInvitation from "./routes/AcceptInvitation.tsx";
import Home from "./routes/Home.tsx";
import VoyageEconomics from "./routes/VoyageEconomics.tsx";
import TradeDesk from "./routes/TradeDesk.tsx";
import Recaps from "./routes/Recaps.tsx";
import AgreementContracts from "./routes/AgreementContracts.tsx";
import ClauseLibrary from "./routes/ClauseLibrary.tsx";
import Compliance from "./routes/Compliance.tsx";
import GlobalMarketSupply from "./routes/GlobalMarketSupply.tsx";
import GlobalMarketCommodities from "./routes/GlobalMarketCommodities.tsx";
import GlobalMarketFreight from "./routes/GlobalMarketFreight.tsx";
import AssetsVessels from "./routes/AssetsVessels.tsx";
import AssetsFleets from "./routes/AssetsFleets.tsx";
import AssetsPorts from "./routes/AssetsPorts.tsx";
import AssetsCanals from "./routes/AssetsCanals.tsx";
import Fixtures from "./routes/Fixtures.tsx";
import SeaNet from "./routes/SeaNet.tsx";
import Notifications from "./routes/Notifications.tsx";
import HelpSupport from "./routes/HelpSupport.tsx";
import Boards from "./routes/Boards.tsx";
import BoardDetail from "./routes/BoardDetail.tsx";
import UserProfile from "./routes/UserProfile.tsx";
import OrganizationSettings from "./routes/OrganizationSettings.tsx";

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
        path: "auth/sign-out",
        element: <SignOut />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password/:token",
        element: <ResetPassword />,
      },
      {
        // Better Auth sends tokens as query params: /reset-password?token=...
        path: "reset-password",
        element: <ResetPassword />,
      },
      {
        path: "invite/:token",
        element: <AcceptInvitation />,
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
        path: "voyage-economics",
        element: <ProtectedRoute><VoyageEconomics /></ProtectedRoute>,
        handle: {
          crumb: () => "Voyage economics",
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
        children: [
          { index: true, element: <Navigate to="/global-market/supply" replace /> },
          { path: "supply", element: <ProtectedRoute><GlobalMarketSupply /></ProtectedRoute>, handle: { crumb: () => "Supply" } },
          { path: "commodities", element: <ProtectedRoute><GlobalMarketCommodities /></ProtectedRoute>, handle: { crumb: () => "Commodities" } },
          { path: "freight", element: <ProtectedRoute><GlobalMarketFreight /></ProtectedRoute>, handle: { crumb: () => "Freight" } },
        ],
      },
      {
        path: "assets",
        children: [
          { index: true, element: <Navigate to="/assets/vessels" replace /> },
          { path: "vessels", element: <ProtectedRoute><AssetsVessels /></ProtectedRoute>, handle: { crumb: () => "Vessels" } },
          { path: "fleets", element: <ProtectedRoute><AssetsFleets /></ProtectedRoute>, handle: { crumb: () => "Fleets" } },
          { path: "ports", element: <ProtectedRoute><AssetsPorts /></ProtectedRoute>, handle: { crumb: () => "Ports" } },
          { path: "canals", element: <ProtectedRoute><AssetsCanals /></ProtectedRoute>, handle: { crumb: () => "Canals" } },
        ],
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
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <NuqsAdapter>
        <RouterProvider router={router} />
      </NuqsAdapter>
    </ConvexBetterAuthProvider>
  </StrictMode>,
);
