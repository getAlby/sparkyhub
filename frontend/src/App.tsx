import { useState, FormEvent } from "react";
import "./App.css";
import AppsManager from "./components/AppsManager"; // Import the new component

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
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
        setMessage("Signup successful!");
        console.log("Signup successful, token:", data.token);
      } else {
        setMessage(`Signup failed: ${data.message || "Unknown error"}`);
        console.error("Signup failed:", data);
      }
    } catch (error) {
      setMessage("Signup failed: Network error or server unavailable.");
      console.error("Signup error:", error);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
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
        setMessage("Login successful!");
        console.log("Login successful, token:", data.token);
      } else {
        setMessage(`Login failed: ${data.message || "Unknown error"}`);
        console.error("Login failed:", data);
      }
    } catch (error) {
      setMessage("Login failed: Network error or server unavailable.");
      console.error("Login error:", error);
    }
  };

  return (
    <>
      <h1>Fastify + React Auth</h1>

      {!token ? (
        <div>
          <h2>Signup or Login</h2>
          <form>
            <div>
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" onClick={handleSignup}>
              Sign Up
            </button>
            <button type="submit" onClick={handleLogin}>
              Login
            </button>
          </form>
        </div>
      ) : (
        <div>
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
              setMessage("Logged out.");
            }}
          >
            Logout
          </button>
          <hr /> {/* Add a separator */}
          {/* Pass the token to AppsManager */}
          <AppsManager token={token} />
        </div>
      )}

      {message && <p style={{ color: token ? "green" : "red" }}>{message}</p>}
    </>
  );
}

export default App;
