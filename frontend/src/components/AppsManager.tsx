import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react"; // Import QR Code component

interface App {
  name: string;
  pubkey: string;
  // Add other relevant app properties if needed
}

// Define props for the component, including the token
interface AppsManagerProps {
  token: string | null; // Allow null initially or if logged out
}

const AppsManager: React.FC<AppsManagerProps> = ({ token }) => {
  const [apps, setApps] = useState<App[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedNwcUrl, setLastCreatedNwcUrl] = useState<string | null>(
    null
  ); // State for the last NWC URL
  const [copySuccess, setCopySuccess] = useState(""); // State for copy feedback

  useEffect(() => {
    // Fetch existing apps only if we have a token
    if (!token) {
      setApps([]); // Clear apps if no token
      setIsLoading(false);
      return;
    }

    const fetchApps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/apps", {
          headers: {
            Authorization: `Bearer ${token}`, // Add auth token
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to parse error
          throw new Error(
            `Failed to fetch apps: ${response.status} ${
              response.statusText
            } - ${errorData.message || ""}`
          );
        }
        const data = await response.json();
        setApps(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Error fetching apps:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApps();
  }, [token]); // Re-run effect if token changes

  const handleCreateApp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newAppName.trim()) {
      setError("App name cannot be empty.");
      return;
    }
    setError(null);
    console.log(`Creating app with name: ${newAppName}`);
    if (!token) {
      setError("Not authenticated. Please log in again.");
      return;
    }

    try {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add auth token
        },
        body: JSON.stringify({ name: newAppName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        throw new Error(
          `Failed to create app: ${response.status} ${response.statusText} - ${
            errorData.message || ""
          }`
        );
      }

      const newApp = await response.json(); // Backend returns { name, pubkey, nwcUrl }
      setApps([...apps, { name: newApp.name, pubkey: newApp.pubkey }]); // Add the new app to the list
      setNewAppName(""); // Clear the input field
      console.log("App created:", newApp);
      setLastCreatedNwcUrl(newApp.nwcUrl); // Store the NWC URL
      setCopySuccess(""); // Reset copy feedback
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Error creating app:", err);
    }
  };

  const copyToClipboard = () => {
    if (lastCreatedNwcUrl) {
      navigator.clipboard
        .writeText(lastCreatedNwcUrl)
        .then(() => {
          setCopySuccess("Copied!");
          setTimeout(() => setCopySuccess(""), 2000); // Clear message after 2s
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          setCopySuccess("Failed to copy");
          setTimeout(() => setCopySuccess(""), 2000);
        });
    }
  };

  return (
    <div>
      <h2>Manage Your Apps</h2>
      {/* Form to create a new app */}
      <form onSubmit={handleCreateApp} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={newAppName}
          onChange={(e) => setNewAppName(e.target.value)}
          placeholder="New App Name"
          required
          style={{ marginRight: "10px" }}
        />
        <button type="submit">+ Connect New App</button>
      </form>
      {/* Display NWC URL and QR code if available */}
      {lastCreatedNwcUrl && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        >
          <h3>New App Connection String:</h3>
          <textarea
            value={lastCreatedNwcUrl}
            readOnly
            style={{
              width: "90%",
              minHeight: "60px",
              marginBottom: "10px",
              fontFamily: "monospace",
              resize: "none",
            }}
          />
          <button onClick={copyToClipboard} style={{ marginRight: "10px" }}>
            {copySuccess || "Copy URL"}
          </button>
          <div style={{ marginTop: "15px" }}>
            <QRCodeCanvas value={lastCreatedNwcUrl} size={128} />
          </div>
        </div>
      )}
      {/* Display existing apps */}
      <h3 style={{ marginTop: "30px" }}>Connected Apps:</h3>
      {isLoading && <p>Loading apps...</p>}
      {error && !lastCreatedNwcUrl && (
        <p style={{ color: "red" }}>Error: {error}</p>
      )}{" "}
      {/* Show fetch error only if not showing NWC URL */}
      {!isLoading && !error && (
        <>
          {apps.length === 0 ? (
            <p>No apps connected yet.</p>
          ) : (
            <ul>
              {apps.map((app, index) => (
                <li key={index}>
                  <strong>{app.name}</strong>: <code>{app.pubkey}</code>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default AppsManager;
