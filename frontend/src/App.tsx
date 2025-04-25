import AppsManager from "@/components/AppsManager";
import { ShieldIcon } from "lucide-react";
import React from "react"; // Removed useState
import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom"; // Import routing components
import { toast } from "sonner";
import Logo from "./assets/logo.svg";
import { MnemonicManager } from "./components/MnemonicManager";
import SparkleEffect from "./components/SparkleEffect";
import { Button } from "./components/ui/button";
import WarningBanner from "./components/WarningBanner";
import { useAuth } from "./context/AuthContext"; // Import useAuth
import LoginPage from "./pages/Login"; // Import LoginPage
import SignupPage from "./pages/Signup"; // Import SignupPage

// A component to protect routes that require authentication
// Refactored ProtectedRoute to use AuthContext
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading } = useAuth(); // Use context

  // Show loading indicator while checking auth status
  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a proper spinner/skeleton
  }

  // If not loading and no token, redirect to login
  if (!token) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" replace />;
  }

  // If loading is finished and token exists, render the children
  return <>{children}</>;
};

function App() {
  // Use the Auth context - removed isLoading as it's handled in ProtectedRoute now
  const { token, logout } = useAuth();

  // Handle logout using context
  const handleLogout = () => {
    logout();
    toast("Logged out.");
  };

  // Optional: Show a loading state while the token is being loaded from localStorage
  // This prevents flashing the login page briefly for authenticated users.
  // However, the ProtectedRoute will also handle loading state.
  // if (isLoading) {
  //   return <div>Loading...</div>; // Or a spinner component
  // }

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen pb-8">
      <WarningBanner />
      <SparkleEffect count={70} />
      <header className="flex flex-col gap-3 items-center justify-center mb-10">
        <Link to="/" className="z-10">
          <img src={Logo} alt="Logo" />
        </Link>
        <p className="text-muted-foreground">
          Simple web bitcoin wallet that connects to apps
        </p>
      </header>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/" />
            ) : (
              <LoginPage /> // Remove setToken prop
            )
          }
        />
        <Route
          path="/signup"
          element={
            token ? (
              <Navigate to="/" />
            ) : (
              <SignupPage /> // Remove setToken prop
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <>
              <div className="w-full max-w-screen-md">
                <div className="flex justify-end gap-4 pr-2 pb-2 -mt-6 sm:-mt-29">
                  <Link to="/security">
                    <Button variant="outline" size="icon">
                      <ShieldIcon />
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
              <div className="flex-1 w-full max-w-screen-md px-2">
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              </div>
            </>
          }
        >
          <Route index element={<AppsManager />} />
          <Route path="/security" element={<MnemonicManager />} />
        </Route>

        {/* Fallback for unknown routes - use token from context */}
        <Route
          path="*"
          element={<Navigate to={token ? "/" : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
