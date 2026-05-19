"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import {
    NURIEK_SITE_URL,
    NURIEK_MISSION,
    NURIEK_TAGLINE,
    NURIEK_HERO_LINE,
    NURIEK_SITE_PILLARS,
} from "@/lib/nuriek-brand";
import { isNuriekWorkEmail, WORK_EMAIL_ERROR } from "@/lib/email-policy";
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
                    <label htmlFor="password">Password</label>
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
    const [lineA, lineB] = (() => {
        const parts = NURIEK_HERO_LINE.split(". ");
        if (parts.length < 2) return [NURIEK_HERO_LINE, ""];
        return [`${parts[0]}.`, parts.slice(1).join(". ").replace(/\.$/, "") + "."];
    })();

    return (
        <main className="loginPage">
            <div className="loginShell">
                <header className="loginTopBar">
                    <span className="loginMark">nuriek</span>
                    <a href={NURIEK_SITE_URL} className="loginTopLink" target="_blank" rel="noopener noreferrer">
                        nuriek.com
                    </a>
                </header>

                <div className="loginGrid">
                    <section className="loginNarrative" aria-label="About nuriek">
                        <h2 className="loginNarrativeHeadline">
                            {lineA}
                            {lineB && (
                                <>
                                    <br />
                                    <span className="loginNarrativeEm">{lineB}</span>
                                </>
                            )}
                        </h2>
                        <p className="loginNarrativeMission">{NURIEK_MISSION}</p>

                        <ul className="loginValues">
                            {NURIEK_SITE_PILLARS.map((p) => (
                                <li key={p.num}>
                                    <span className="loginValuesNum">{p.num}</span>
                                    <span>
                                        <strong>{p.title}</strong>
                                        <small>{p.description}</small>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <p className="loginNarrativeFoot">{NURIEK_TAGLINE}</p>
                    </section>

                    <section className="loginPanel" aria-label="Sign in">
                        <Suspense
                            fallback={
                                <div className="loginFormWrap loginFormWrap--loading">
                                    <Loader2 size={28} className="loginSpin" />
                                </div>
                            }
                        >
                            <LoginForm />
                        </Suspense>
                    </section>
                </div>
            </div>
        </main>
    );
}
