import { createContext, useContext } from "react";

// Define the shape of the context value
interface AuthContextType {
  token: string | null;
  isLoading: boolean; // To track initial token loading from localStorage
  login: (newToken: string) => void;
  logout: () => void;
}

// Create the context with an undefined initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Export the context itself if needed elsewhere (though useAuth is preferred)
export default AuthContext;
