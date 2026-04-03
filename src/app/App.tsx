import { RouterProvider } from "react-router";
import { createRouter } from "./routes";
import { AppProvider } from "./context/AppContext";

const router = createRouter();

// ERP System Entry Point
export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}