"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import LoginPageShell from "@/components/LoginPageShell";
import "@/styles/login.css";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        if (!token) {
            setValidating(false);
            setTokenValid(false);
            return;
        }

        fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
            .then((res) => res.json())
            .then((data) => setTokenValid(Boolean(data.valid)))
            .catch(() => setTokenValid(false))
            .finally(() => setValidating(false));
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Could not reset password. Please request a new link.");
            } else {
                router.push("/login?reset=success");
            }
        } catch {
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="loginFormWrap loginFormWrap--loading">
                <Loader2 size={28} className="loginSpin" />
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="loginFormWrap">
                <header className="loginFormHeader">
                    <p className="loginFormEyebrow">nuriek core</p>
                    <h1 className="loginFormTitle">Link expired</h1>
                    <p className="loginFormLead">
                        This reset link is invalid or has expired. Request a new one from the sign-in
                        page.
                    </p>
                </header>
                <p className="loginFormHelp">
                    <Link href="/login/forgot-password">Request new reset link</Link>
                    {" · "}
                    <Link href="/login">Back to sign in</Link>
                </p>
            </div>
        );
    }

    return (
        <div className="loginFormWrap">
            <header className="loginFormHeader">
                <p className="loginFormEyebrow">nuriek core</p>
                <h1 className="loginFormTitle">Set new password</h1>
                <p className="loginFormLead">
                    Choose a strong password (10+ characters with upper, lower, and a number).
                </p>
            </header>

            <form className="loginForm" onSubmit={handleSubmit}>
                {error && (
                    <div className="loginError" role="alert">
                        <AlertCircle size={17} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="loginField">
                    <label htmlFor="password">New password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        minLength={10}
                    />
                </div>

                <div className="loginField">
                    <label htmlFor="confirmPassword">Confirm password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        minLength={10}
                    />
                </div>

                <button type="submit" className="loginSubmit" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 size={20} className="loginSpin" />
                    ) : (
                        <>
                            Update password
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <p className="loginFormHelp">
                <Link href="/login">Back to sign in</Link>
            </p>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <LoginPageShell>
            <Suspense
                fallback={
                    <div className="loginFormWrap loginFormWrap--loading">
                        <Loader2 size={28} className="loginSpin" />
                    </div>
                }
            >
                <ResetPasswordForm />
            </Suspense>
        </LoginPageShell>
    );
}
