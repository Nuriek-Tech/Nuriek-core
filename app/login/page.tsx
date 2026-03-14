"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from "lucide-react";
import "@/styles/login.css";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!email.trim().toLowerCase().endsWith("@nuriek.com")) {
            setError("Only @nuriek.com email addresses are allowed.");
            setIsLoading(false);
            return;
        }

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password. Please try again.");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="form" onSubmit={handleSubmit}>
            {error && (
                <div className="errorBox">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div className="inputGroup">
                <label className="label">Work Email</label>
                <div className="inputWrapper">
                    <Mail className="inputIcon" size={18} />
                    <input
                        type="email"
                        className="input"
                        placeholder="email@nuriek.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="inputGroup">
                <label className="label">Password</label>
                <div className="inputWrapper">
                    <Lock className="inputIcon" size={18} />
                    <input
                        type="password"
                        className="input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <button type="submit" className="loginButton" disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : (
                    <>
                        <LogIn size={20} />
                        <span>Sign In</span>
                    </>
                )}
            </button>
        </form>
    );
}

export default function LoginPage() {

    return (
        <main className="loginContainer">
            <div className="loginBackground">
                <div className="blob"></div>
                <div className="blob"></div>
            </div>
            <div className="loginCard glass">
                <header className="loginHeader">
                    <Image
                        src="/logo.png"
                        alt="Nuriek Logo"
                        width={64}
                        height={64}
                        className="logo"
                    />
                    <h1 className="title text-gradient">Nuriek Core</h1>
                    <p className="subtitle">Company Operating System</p>
                </header>

                <Suspense fallback={<div className="loading" style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>}>
                    <LoginForm />
                </Suspense>

                <footer className="footer">
                    <p>
                        Secure access for Nuriek teams. <br />
                        Having trouble? <a href="#">Contact Support</a>
                    </p>
                </footer>
            </div>
        </main>
    );
}
