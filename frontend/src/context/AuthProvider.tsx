import React, { ReactNode, useEffect, useState } from "react";
import AuthContext from "./AuthContext"; // Import the context

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  // Effect to load token from localStorage on initial mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Failed to read token from localStorage", error);
      // Handle potential errors (e.g., localStorage disabled)
    } finally {
      setIsLoading(false); // Finished loading attempt
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to handle login
  const login = (newToken: string) => {
    try {
      localStorage.setItem("authToken", newToken);
      setToken(newToken);
    } catch (error) {
      console.error("Failed to save token to localStorage", error);
      // Handle potential errors (e.g., storage full)
    }
  };

  // Function to handle logout
  const logout = () => {
    try {
      localStorage.removeItem("authToken");
      setToken(null);
    } catch (error) {
      console.error("Failed to remove token from localStorage", error);
    }
  };

  // Value provided to consuming components
  const value = {
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
