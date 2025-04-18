import { useAuth } from "@/context/AuthContext";
import { CirclePlus, Copy } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react"; // Import QR Code component
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";

interface App {
  name: string;
  pubkey: string;
  // Add other relevant app properties if needed
}

const AppsManager: React.FC = () => {
  const { token } = useAuth();
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
    <div className="w-full max-w-screen-md">
      {/* Form to create a new app */}
      <form onSubmit={handleCreateApp}>
        <Card>
          <CardHeader>
            <CardTitle>Create a new app</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="Name"
              required
            />
          </CardContent>
          <CardFooter>
            <Button type="submit">
              <CirclePlus className="w-4 h-4 mr-2" />
              Connect App
            </Button>
          </CardFooter>
        </Card>
      </form>
      {/* Display NWC URL and QR code if available */}
      {lastCreatedNwcUrl && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Connect your App</CardTitle>
            <CardDescription>
              Scan the QR Code or copy & paste the connection secret
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 justify-start items-start">
            <div className="bg-white p-2 rounded-lg">
              <QRCodeCanvas value={lastCreatedNwcUrl} size={150} />
            </div>
            <div className="flex flex-row items-center gap-2 flex-1 w-full">
              <Input
                value={lastCreatedNwcUrl}
                readOnly
                className="font-mono w-full"
              />
              <Button onClick={copyToClipboard} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Display existing apps */}
      <h3 className="text-2xl font-semibold my-5">Connected Apps</h3>
      {isLoading && <p>Loading apps...</p>}
      {error && !lastCreatedNwcUrl && (
        <p className="text-red-500">Error: {error}</p>
      )}{" "}
      {/* Show fetch error only if not showing NWC URL */}
      {!isLoading && !error && (
        <>
          {apps.length === 0 ? (
            <p className="text-muted-foreground">No apps connected yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {apps.map((app, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{app.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="break-words">
                    {app.pubkey}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AppsManager;
