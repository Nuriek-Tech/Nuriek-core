"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import LoginPageShell from "@/components/LoginPageShell";
import { isNuriekWorkEmail, WORK_EMAIL_ERROR } from "@/lib/email-policy";
import "@/styles/login.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        if (!isNuriekWorkEmail(email)) {
            setError(WORK_EMAIL_ERROR);
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || "Something went wrong. Please try again.");
            } else {
                setSuccess(
                    data.message ||
                        "If your work email is registered, you will receive a password reset link shortly."
                );
            }
        } catch {
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LoginPageShell>
            <div className="loginFormWrap">
                <header className="loginFormHeader">
                    <p className="loginFormEyebrow">nuriek core</p>
                    <h1 className="loginFormTitle">Forgot password</h1>
                    <p className="loginFormLead">
                        Enter your @nuriek.com work email. We will send a secure reset link if an
                        account exists.
                    </p>
                </header>

                <form className="loginForm" onSubmit={handleSubmit}>
                    {error && (
                        <div className="loginError" role="alert">
                            <AlertCircle size={17} />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="loginSuccess" role="status">
                            <CheckCircle2 size={17} />
                            <span>{success}</span>
                        </div>
                    )}

                    <div className="loginField">
                        <label htmlFor="email">Work email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="user@nuriek.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading || !!success}
                            autoComplete="username"
                            inputMode="email"
                            spellCheck={false}
                        />
                    </div>

                    <button
                        type="submit"
                        className="loginSubmit"
                        disabled={isLoading || !!success}
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="loginSpin" />
                        ) : (
                            <>
                                Send reset link
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <p className="loginFormHelp">
                    <Link href="/login">
                        <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Back to sign in
                    </Link>
                </p>
            </div>
        </LoginPageShell>
    );
}
