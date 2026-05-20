"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import LoginPageShell from "@/components/LoginPageShell";
import { isNuriekWorkEmail, WORK_EMAIL_ERROR } from "@/lib/email-policy";
import "@/styles/login.css";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    const resetSuccess = searchParams.get("reset") === "success";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!isNuriekWorkEmail(email)) {
            setError(WORK_EMAIL_ERROR);
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
                if (result.error === "DatabaseUnavailable") {
                    setError(
                        "Cannot reach the database right now. Open your Neon dashboard, resume the project if it is paused, then try again."
                    );
                } else if (result.error === "TooManyAttempts") {
                    setError("Too many sign-in attempts. Please wait about 15 minutes and try again.");
                } else {
                    setError("Invalid email or password. Please try again.");
                }
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="loginFormWrap">
            <header className="loginFormHeader">
                <p className="loginFormEyebrow">nuriek core</p>
                <h1 className="loginFormTitle">Sign in</h1>
                <p className="loginFormLead">
                    Your team workspace for time, documents, and people.
                </p>
            </header>

            <form className="loginForm" onSubmit={handleSubmit}>
                {resetSuccess && (
                    <div className="loginSuccess" role="status">
                        <CheckCircle2 size={17} />
                        <span>Your password was updated. You can sign in now.</span>
                    </div>
                )}
                {error && (
                    <div className="loginError" role="alert">
                        <AlertCircle size={17} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="loginField">
                    <label htmlFor="email">Work email</label>
                    <input
                        id="email"
                        name="nuriek-work-email"
                        type="email"
                        placeholder="user@nuriek.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="username"
                        inputMode="email"
                        spellCheck={false}
                        data-1p-ignore
                    />
                </div>

                <div className="loginField">
                    <div className="loginFieldLabelRow">
                        <label htmlFor="password">Password</label>
                        <Link href="/login/forgot-password" className="loginForgotLink">
                            Forgot password?
                        </Link>
                    </div>
                    <input
                        id="password"
                        type="password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                    />
                </div>

                <button type="submit" className="loginSubmit" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 size={20} className="loginSpin" />
                    ) : (
                        <>
                            Sign in
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <p className="loginFormHelp">
                Trouble signing in? <Link href="/contact-hr">Contact HR</Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <LoginPageShell>
            <Suspense
                fallback={
                    <div className="loginFormWrap loginFormWrap--loading">
                        <Loader2 size={28} className="loginSpin" />
                    </div>
                }
            >
                <LoginForm />
            </Suspense>
        </LoginPageShell>
    );
}
