import { Label } from "@radix-ui/react-label"; // Corrected import path if needed
import React, { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import Link and useNavigate
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../context/AuthContext"; // Import useAuth

// Remove LoginPageProps interface as setToken is no longer needed

const LoginPage: React.FC = () => {
  // Remove props
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from context

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    // No need to clear token here, login function handles setting it
    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.token); // Use login function from context
        toast("Login successful!");
        console.log("Login successful, token:", data.token);
        navigate("/"); // Redirect to home page on successful login
      } else {
        toast(`Login failed: ${data.message || "Unknown error"}`);
        console.error("Login failed:", data);
      }
    } catch (error) {
      toast("Login failed: Network error or server unavailable.");
      console.error("Login error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <Card className="w-full max-w-sm bg-card/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Sign in to access your wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            {" "}
            {/* Use onSubmit on the form */}
            <div className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="username">Username</Label>{" "}
                {/* Corrected htmlFor */}
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {" "}
                {/* Removed onClick, using form's onSubmit */}
                Sign in
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <Link to="/signup" className="underline underline-offset-4">
                {" "}
                {/* Use Link for navigation */}
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
