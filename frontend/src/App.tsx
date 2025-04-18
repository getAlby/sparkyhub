import React, { useState } from "react";
import { Routes, Route, Navigate, Outlet, Link } from "react-router-dom"; // Import routing components
import AppsManager from "./components/AppsManager";
import LoginPage from "./pages/Login"; // Import LoginPage
import SignupPage from "./pages/Signup"; // Import SignupPage
import Logo from "./assets/logo.svg";
import { toast } from "sonner";
import { MnemonicManager } from "./components/MnemonicManager";
import { ShieldIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import SparkleEffect from "./components/SparkleEffect";

// A component to protect routes that require authentication
const ProtectedRoute = ({
  token,
  children,
}: {
  token: string | null;
  children: React.ReactNode;
}) => {
  if (!token) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>; // Render children if token exists
};

function App() {
  // Keep token state here to manage authentication globally
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  ); // Initialize from localStorage

  const handleSetToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem("authToken", newToken); // Store token in localStorage
    } else {
      localStorage.removeItem("authToken"); // Remove token from localStorage on logout
    }
  };

  const handleLogout = () => {
    handleSetToken(null);
    toast("Logged out.");
    // No need to clear username/password state as it's managed in pages now
  };

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen py-8">
      <SparkleEffect count={70} />
      <div className="flex flex-col gap-3 items-center justify-center mb-10">
        <img src={Logo} alt="Logo" /> {/* Added alt text */}
        <p className="text-muted-foreground">Simple web bitcoin wallet that connects to apps</p>
      </div>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/" />
            ) : (
              <LoginPage setToken={handleSetToken} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            token ? (
              <Navigate to="/" />
            ) : (
              <SignupPage setToken={handleSetToken} />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute token={token}>
              {/* Outlet renders nested routes or the main content */}
              <Outlet />
            </ProtectedRoute>
          }
        >
          {/* Default protected route content (e.g., dashboard) */}
          <Route
            index
            element={
              <div className="w-full max-w-4xl px-4">
                <div className="flex justify-end mb-8 gap-4 -mt-22">
                  <Link to="/security">
                    <Button
                      variant="outline"
                      size="icon">
                      <ShieldIcon />
                    </Button>
                  </Link>
                  <Button
                    className="backdrop-blur-xs"
                    variant="outline"
                    onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
            }
          />
          <Route path="/security" element={<MnemonicManager token={token} />} />
        </Route>

        {/* Fallback for unknown routes */}
        <Route
          path="*"
          element={<Navigate to={token ? "/" : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
