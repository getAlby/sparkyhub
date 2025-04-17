import React, { useState, FormEvent } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Label } from "@radix-ui/react-label"; // Corrected import path if needed
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom"; // Import Link and useNavigate
import { LoadingButton } from "@/components/ui/loading-button";

interface SignupPageProps {
    setToken: (token: string | null) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ setToken }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        setToken(null); // Clear previous token if any

        try {
            setLoading(true);
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
                navigate("/"); // Redirect to home page on successful signup
            } else {
                toast(`Signup failed: ${data.message || "Unknown error"}`);
                console.error("Signup failed:", data);
            }
        } catch (error) {
            toast("Signup failed: Network error or server unavailable.");
            console.error("Signup error:", error);
        }

        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <Card className="w-full max-w-sm bg-card/40 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Get Started</CardTitle>
                    <CardDescription>
                        Set up your wallet in a few seconds
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required />
                            </div>
                            <LoadingButton type="submit" className="w-full" loading={loading}>
                                Create Wallet
                            </LoadingButton>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?{" "}
                            <Link to="/login" className="underline underline-offset-4">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default SignupPage;
