import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import App from "./App.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { AuthProvider } from "./context/AuthProvider"; // Import AuthProvider

import "./fonts.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {" "}
      {/* Wrap App with BrowserRouter */}
      <AuthProvider>
        {" "}
        {/* Wrap App and Toaster with AuthProvider */}
        <App />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
