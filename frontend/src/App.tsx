import { useState, FormEvent } from "react";
import AppsManager from "./components/AppsManager"; // Import the new component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Label } from "@radix-ui/react-label";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import Logo from "./assets/logo.svg";
import { toast } from "sonner";


function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setToken(null);
    try {
      const response = await fetch("/api/users/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        toast("Signup successful!", {});
        console.log("Signup successful, token:", data.token);
      } else {
        toast(`Signup failed: ${data.message || "Unknown error"}`);
        console.error("Signup failed:", data);
      }
    } catch (error) {
      toast("Signup failed: Network error or server unavailable.");
      console.error("Signup error:", error);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setToken(null);
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
        setToken(data.token);
        toast("Login successful!");
        console.log("Login successful, token:", data.token);
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
    <>
      <div className="flex flex-col items-center justify-center h-full">
        <img src={Logo} className="my-5" />
        {!token ? (
          <div className="flex flex-col gap-6 w-sm mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription>
                  Enter your email below to login to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <a
                          href="#"
                          className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <Input id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required />
                    </div>
                    <Button type="submit" className="w-full" onClick={handleLogin}>
                      Sign in
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    Don't have an account?{" "}
                    <a href="#" className="underline underline-offset-4">
                      Sign up
                    </a>
                  </div>
                </form>
              </CardContent>
            </Card>
            {/* <form>
           
           
            <button type="submit" onClick={handleSignup}>
              Sign Up
            </button>
            <button type="submit" onClick={handleLogin}>
              Login
            </button>
          </form> */}
          </div>
        ) : (
          <div className="">
            <h2>Welcome, {username}!</h2>
            <p>You are logged in.</p>
            <p>
              Token: <code>{token}</code>
            </p>
            <button
              onClick={() => {
                setToken(null);
                setUsername("");
                setPassword("");
                toast("Logged out.");
              }}
            >
              Logout
            </button>
            <hr /> {/* Add a separator */}
            {/* Pass the token to AppsManager */}
            <AppsManager token={token} />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
