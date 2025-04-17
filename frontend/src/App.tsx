import { useState, FormEvent, useEffect } from "react"; // Import useEffect
import "./App.css";
import AppsManager from "./components/AppsManager"; // Import the new component
import { MnemonicManager } from "./components/MnemonicManager";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Check localStorage for token on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem("jwtToken");
    if (storedToken) {
      setToken(storedToken);
      // Optionally, you might want to fetch user details here based on the token
      // For simplicity, we'll just restore the token state.
      // You might need to store/retrieve username too if needed outside login flow.
      setMessage("Session restored.");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

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
        localStorage.setItem("jwtToken", data.token); // Save token to localStorage
        setToken(data.token);
        setMessage("Signup successful!");
        console.log("Signup successful, token:", data.token);
      } else {
        localStorage.removeItem("jwtToken"); // Clear token on failure
        setMessage(`Signup failed: ${data.message || "Unknown error"}`);
        console.error("Signup failed:", data);
      }
    } catch (error) {
      localStorage.removeItem("jwtToken"); // Clear token on error
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
        localStorage.setItem("jwtToken", data.token); // Save token to localStorage
        setToken(data.token);
        setMessage("Login successful!");
        console.log("Login successful, token:", data.token);
      } else {
        localStorage.removeItem("jwtToken"); // Clear token on failure
        setMessage(`Login failed: ${data.message || "Unknown error"}`);
        console.error("Login failed:", data);
      }
    } catch (error) {
      localStorage.removeItem("jwtToken"); // Clear token on error
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
              localStorage.removeItem("jwtToken"); // Remove token from localStorage
              setToken(null);
              setUsername(""); // Clear username on logout
              setPassword(""); // Clear password on logout
              setMessage("Logged out.");
            }}
          >
            Logout
          </button>
          <hr /> {/* Add a separator */}
          {/* Pass the token to AppsManager */}
          <AppsManager token={token} />
          <MnemonicManager token={token} />
        </div>
      )}

      {message && <p style={{ color: token ? "green" : "red" }}>{message}</p>}
    </>
  );
}

export default App;
