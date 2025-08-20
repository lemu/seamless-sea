import React from "react";
import { Outlet } from "react-router";
import { AppFrame } from "./components/AppFrame";

function App() {
  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  );
}

export default App;
