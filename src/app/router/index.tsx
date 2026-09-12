import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "@/App";
import Generator from "@/components/Generator";
import Soundboard from "@/widgets/soundboard/Soundboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/excuses",
    element: (
      <div className="min-h-screen bg-ink text-paper p-4">
        <Generator />
      </div>
    ),
  },
  {
    path: "/soundboard",
    element: (
      <div className="min-h-screen bg-amber-100 text-ink p-4">
        <Soundboard />
      </div>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
