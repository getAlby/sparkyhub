import React, { useState, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "@radix-ui/react-label"; // Corrected import path if needed
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate

interface LoginPageProps {
    setToken: (token: string | null) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setToken }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setToken(null); // Clear previous token if any
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
                navigate('/'); // Redirect to home page on successful login
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
                    <CardDescription>
                        Sign in to access your wallet
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin}> {/* Use onSubmit on the form */}
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="username">Username</Label> {/* Corrected htmlFor */}
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
                                <Input id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required />
                            </div>
                            <Button type="submit" className="w-full"> {/* Removed onClick, using form's onSubmit */}
                                Sign in
                            </Button>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Don't have an account?{" "}
                            <Link to="/signup" className="underline underline-offset-4"> {/* Use Link for navigation */}
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