import React, { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom"; // Import routing components
import AppsManager from "./components/AppsManager";
import LoginPage from "./pages/Login"; // Import LoginPage
import SignupPage from "./pages/Signup"; // Import SignupPage
import Logo from "./assets/logo.svg";
import { toast } from "sonner";
import { MnemonicManager } from "./components/MnemonicManager";
import { ShieldIcon } from "lucide-react";

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

  const [showSecurity, setShowSecurity] = React.useState(false);
  const toggleSecurity = () => setShowSecurity((current) => !current);

  const handleLogout = () => {
    handleSetToken(null);
    toast("Logged out.");
    // No need to clear username/password state as it's managed in pages now
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <img src={Logo} className="mb-5" alt="Logo" /> {/* Added alt text */}
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
                {" "}
                {/* Added container for content */}
                {/* Removed welcome message, AppsManager is the main content now */}
                {/* <p>
                 Token: <code>{token}</code>
               </p> */}
                <div className="flex justify-end mb-4 gap-4">
                  {" "}
                  {/* Position logout button */}
                  <button
                    onClick={handleLogout}
                    className="text-sm underline cursor-pointer"
                  >
                    Logout
                  </button>
                  <button onClick={toggleSecurity} className="cursor-pointer">
                    <ShieldIcon />
                  </button>
                </div>
                {token && <AppsManager token={token} />}{" "}
                {/* Render AppsManager only if token exists */}
                {token && showSecurity && <MnemonicManager token={token} />}
              </div>
            }
          />
          {/* Add other protected routes here if needed */}
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
