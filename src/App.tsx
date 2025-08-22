import { Outlet } from "react-router";
import { AppFrame } from "./components/AppFrame";
import { UserProvider } from "./contexts/UserContext";

function App() {
  return (
    <UserProvider>
      <AppFrame>
        <Outlet />
      </AppFrame>
    </UserProvider>
  );
}

export default App;
