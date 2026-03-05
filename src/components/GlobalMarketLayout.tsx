import { Outlet } from "react-router";
import { DeskProvider } from "../contexts/DeskContext";
import { DeskSelector } from "./DeskSelector";

export function GlobalMarketLayout() {
  return (
    <DeskProvider>
      <DeskSelector />
      <Outlet />
    </DeskProvider>
  );
}
