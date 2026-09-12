import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { AppRouter } from "@/app/router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <AppRouter />
      <Toaster richColors position="top-right" />
    </QueryProvider>
  </StrictMode>
);
