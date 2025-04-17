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
  const [mnemonicInput, setMnemonicInput] = useState(""); // State for mnemonic input
  const [mnemonicMessage, setMnemonicMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null); // State for mnemonic update feedback

  // State for the new mnemonic backup feature
  const [showMnemonic, setShowMnemonic] = useState(false);
  // const [currentMnemonic, setCurrentMnemonic] = useState<string | null>(null); // Removed, mnemonicWords is used instead
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [wordVisibility, setWordVisibility] = useState<boolean[]>([]);
  const [mnemonicError, setMnemonicError] = useState<string | null>(null);
  const [backupConfirmed, setBackupConfirmed] = useState(false); // State for checkbox

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

  // Function to handle mnemonic update
  const handleUpdateMnemonic = async (event: React.FormEvent) => {
    event.preventDefault();
    setMnemonicMessage(null); // Clear previous messages
    if (!mnemonicInput.trim()) {
      setMnemonicMessage({
        text: "Mnemonic phrase cannot be empty.",
        type: "error",
      });
      return;
    }
    if (!token) {
      setMnemonicMessage({
        text: "Not authenticated. Please log in again.",
        type: "error",
      });
      return;
    }

    // Basic validation (e.g., word count) - backend does the real validation
    const wordCount = mnemonicInput.trim().split(/\s+/).length;
    if (wordCount !== 12 && wordCount !== 24) {
      // Common mnemonic lengths
      setMnemonicMessage({
        text: "Warning: Mnemonic phrases usually have 12 or 24 words.",
        type: "error", // Treat as error for now, backend will confirm validity
      });
      // Optionally return here or let the backend handle full validation
      // return;
    }

    try {
      const response = await fetch("/api/users/mnemonic", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add auth token
        },
        body: JSON.stringify({ mnemonic: mnemonicInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to update mnemonic: ${response.status} ${response.statusText}`
        );
      }

      setMnemonicMessage({ text: data.message, type: "success" });
      setMnemonicInput(""); // Clear input on success
      // Optionally: Trigger a refresh or notify user about potential backend restart/reconnect
    } catch (err) {
      setMnemonicMessage({
        text: err instanceof Error ? err.message : "An unknown error occurred",
        type: "error",
      });
      console.error("Error updating mnemonic:", err);
    }
  };

  // Handler to fetch and show the mnemonic
  const handleShowMnemonic = async () => {
    if (!token) {
      setMnemonicError("Not authenticated.");
      return;
    }
    setShowMnemonic(true); // Show the section immediately
    // setCurrentMnemonic(null); // Removed
    setMnemonicError(null); // Clear previous errors
    // setMnemonicCopySuccess(""); // Removed
    try {
      // Use the helper function defined outside
      const mnemonic = await fetchCurrentMnemonic(token);
      // setCurrentMnemonic(mnemonic); // Removed
      const words = mnemonic.split(" ");
      setMnemonicWords(words);
      setWordVisibility(Array(words.length).fill(false)); // Initialize all words as hidden
      setBackupConfirmed(false); // Reset checkbox on show
    } catch (err) {
      setMnemonicError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Error fetching mnemonic:", err);
      // Optionally hide the section again on error, or keep it open showing the error
      // setShowMnemonic(false);
    }
  };

  // Handler to toggle individual word visibility
  const toggleWordVisibility = (index: number) => {
    setWordVisibility((prevVisibility) =>
      prevVisibility.map((visible, i) => (i === index ? !visible : visible))
    );
  };

  // Handler to close the mnemonic view
  const handleCloseMnemonicView = () => {
    setShowMnemonic(false);
    // setCurrentMnemonic(null); // Removed
    setMnemonicWords([]);
    setWordVisibility([]);
    setMnemonicError(null);
    setBackupConfirmed(false);
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

      {/* --- Mnemonic Import Section --- */}
      <hr style={{ margin: "40px 0" }} />
      <h2>Security Settings</h2>
      <form onSubmit={handleUpdateMnemonic} style={{ marginBottom: "20px" }}>
        <h3>Import Existing Mnemonic</h3>
        <p>
          Replace the current wallet's recovery phrase with your own.{" "}
          <strong>Warning:</strong> This action is irreversible and will change
          the underlying wallet. Ensure you have backed up the current phrase if
          needed.
        </p>
        <textarea
          value={mnemonicInput}
          onChange={(e) => setMnemonicInput(e.target.value)}
          placeholder="Enter your 12 or 24 word mnemonic phrase here..."
          required
          rows={3}
          style={{
            width: "90%",
            minHeight: "60px",
            marginBottom: "10px",
            fontFamily: "monospace",
            resize: "vertical",
          }}
        />
        <button type="submit">Import Mnemonic</button>
        {mnemonicMessage && (
          <p
            style={{
              color: mnemonicMessage.type === "success" ? "green" : "red",
              marginTop: "10px",
            }}
          >
            {mnemonicMessage.text}
          </p>
        )}
      </form>

      {/* --- Show Current Mnemonic Section --- */}
      <div style={{ marginTop: "20px" }}>
        <h3>Backup Recovery Phrase</h3>
        {!showMnemonic ? (
          <button onClick={handleShowMnemonic}>Show Recovery Phrase</button>
        ) : (
          <div
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "5px",
              maxWidth: '40%', // Apply max width to the entire block
              margin: '0 auto', // Center the block horizontally
            }}
          >
            <p style={{ color: "orange", fontWeight: "bold", marginTop: 0 }}>
              ⚠️ Warning: Never share your recovery phrase! Anyone with this
              phrase can access your funds. Store it securely offline.
            </p>
            {mnemonicError ? (
              <p style={{ color: "red" }}>Error: {mnemonicError}</p>
            ) : mnemonicWords.length > 0 ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "20px",
                    fontFamily: "monospace",
                  }}
                >
                  {mnemonicWords.map((word, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        padding: "5px 8px",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <span style={{ marginRight: "8px", color: "#777" }}>
                         {index + 1}.
                       </span>
                       <span style={{ flexGrow: 1, color: '#000' }}> {/* Set text color to black */}
                         {wordVisibility[index] ? word : "••••••"}
                       </span>
                       <button
                        onClick={() => toggleWordVisibility(index)}
                        title={wordVisibility[index] ? "Hide word" : "Show word"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0 5px",
                          fontSize: "1.1em",
                          lineHeight: "1",
                        }}
                      >
                        {wordVisibility[index] ? "👁️‍🗨️" : "👁️"} {/* Eye icons */}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "15px", display: "flex", alignItems: "center" }}>
                   <input
                     type="checkbox"
                     id="backupConfirmed"
                     checked={backupConfirmed}
                     onChange={(e) => setBackupConfirmed(e.target.checked)}
                     style={{ marginRight: "10px" }}
                   />
                   <label htmlFor="backupConfirmed">
                     I've backed up my recovery phrase to my wallet in a private and secure place
                   </label>
                 </div>
                <button
                  onClick={handleCloseMnemonicView}
                  disabled={!backupConfirmed} // Disable button until checkbox is checked
                  style={{ marginTop: "15px" }}
                >
                  Done
                </button>
              </>
            ) : (
              <p>Loading...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to fetch the current mnemonic (defined outside component)
async function fetchCurrentMnemonic(token: string): Promise<string> {
    const response = await fetch("/api/users/mnemonic", {
      method: "GET", // Use GET to retrieve
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch mnemonic");
    }
    return data.mnemonic;
  }

/* Remove duplicated handlers and component definition below */
/*
   // Handler to fetch and show the mnemonic
   const handleShowMnemonic = async () => {
    if (!token) {
      setMnemonicError("Not authenticated.");
      return;
    }
    setShowMnemonic(true); // Show the section immediately
    setCurrentMnemonic(null); // Reset previous mnemonic
    setMnemonicError(null); // Clear previous errors
    setMnemonicCopySuccess(""); // Clear copy feedback
    try {
      const mnemonic = await fetchCurrentMnemonic(token);
      setCurrentMnemonic(mnemonic);
    } catch (err) {
      setMnemonicError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Error fetching mnemonic:", err);
      // Optionally hide the section again on error, or keep it open showing the error
      // setShowMnemonic(false);
    }
  };

  // Handler to copy the mnemonic
  const copyMnemonicToClipboard = () => {
    if (currentMnemonic) {
      navigator.clipboard
        .writeText(currentMnemonic)
        .then(() => {
          setMnemonicCopySuccess("Copied!");
          setTimeout(() => setMnemonicCopySuccess(""), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy mnemonic: ", err);
          setMnemonicCopySuccess("Failed to copy");
          setTimeout(() => setMnemonicCopySuccess(""), 2000);
        });
    }
  };
*/

export default AppsManager;
