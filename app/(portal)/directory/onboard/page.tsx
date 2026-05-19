"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    UserPlus,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Brain,
    GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ROLES, isAdminRole } from "@/lib/constants";
import {
    NURIEK_PSYCHOLOGY_INTRO,
    NURIEK_PSYCHOLOGY_PILLARS,
    NURIEK_PSYCHOLOGY_TAGLINE,
} from "@/lib/nuriek-psychology";
import "@/styles/people-hub.css";
import "../../admin/documents/admin-documents.css";
import ReportingManagerSelect from "@/components/ReportingManagerSelect";
import "./onboard.css";

function OnboardForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const currentUserRole = session?.user?.role;

    const roleQuery = searchParams.get("role");
    const isInternFlow = roleQuery === "INTERN";

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: roleQuery || "EMPLOYEE",
        department: "Engineering",
        position: "",
        reportsToId: "",
    });

    useEffect(() => {
        if (session && !isAdminRole(session.user?.role)) {
            router.replace("/dashboard");
        }
    }, [session, router]);

    useEffect(() => {
        if (roleQuery === "INTERN") {
            setFormData((prev) => ({
                ...prev,
                role: "INTERN",
                position: prev.position || "Software Engineering Intern",
                department: prev.department || "Engineering",
            }));
        }
    }, [roleQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => router.push("/interns"), 2200);
            } else {
                let msg = "Failed to onboard employee";
                try {
                    const data = await res.json();
                    msg = data.error || msg;
                } catch {
                    msg = (await res.text()) || msg;
                }
                setError(msg);
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="obSuccess glass">
                <div className="obSuccessIcon">
                    <CheckCircle2 size={44} />
                </div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                    {isInternFlow ? "Intern journey started" : "Onboarding initiated"}
                </h2>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    Welcome email sent to <strong>{formData.email}</strong>.
                    {isInternFlow
                        ? " They'll see the Nuriek Psychology welcome when they first sign in."
                        : " Redirecting…"}
                </p>
            </div>
        );
    }

    return (
        <div className="hubPage obHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <Link href={isInternFlow ? "/interns" : "/directory"} className="admBackLink">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">
                        {isInternFlow ? "Intern program" : "People ops"}
                    </p>
                    <h1>
                        {isInternFlow ? (
                            <>
                                Onboard <span className="text-gradient">Intern</span>
                            </>
                        ) : (
                            <>
                                Onboard <span className="text-gradient">Teammate</span>
                            </>
                        )}
                    </h1>
                    <p className="hubSubtitle">
                        {isInternFlow
                            ? "Create portal access and seed their psychology-aligned onboarding checklist."
                            : "Send credentials and initialize their Nuriek Core profile."}
                    </p>
                </div>
            </header>

            {isInternFlow && (
                <div className="obPsychBanner glass">
                    <div className="obPsychIcon">
                        <Brain size={24} />
                    </div>
                    <div>
                        <p className="obPsychTitle">{NURIEK_PSYCHOLOGY_TAGLINE}</p>
                        <p className="obPsychText">{NURIEK_PSYCHOLOGY_INTRO}</p>
                        <div className="obPillarRow">
                            {NURIEK_PSYCHOLOGY_PILLARS.map((p) => (
                                <span key={p.id} className="obPillarChip">
                                    {p.title}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="obFormPanel glass admFormStack">
                <div className="admPanelHeader">
                    <h2 className="admPanelTitle">
                        <span className="admPanelTitleIcon">
                            {isInternFlow ? <GraduationCap size={18} /> : <UserPlus size={18} />}
                        </span>
                        Account details
                    </h2>
                </div>

                <div className="obFormGrid">
                    <div className="admField">
                        <label className="admLabel">Full name</label>
                        <input
                            required
                            type="text"
                            className="admInput"
                            placeholder="Full legal name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="admField">
                        <label className="admLabel">Work email</label>
                        <input
                            required
                            type="email"
                            className="admInput"
                            placeholder="name@nuriek.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="admField">
                        <label className="admLabel">Position</label>
                        <input
                            required
                            type="text"
                            className="admInput"
                            placeholder={
                                isInternFlow ? "Software Engineering Intern" : "e.g. Product Designer"
                            }
                            value={formData.position}
                            onChange={(e) =>
                                setFormData({ ...formData, position: e.target.value })
                            }
                        />
                    </div>

                    <div className="admField">
                        <label className="admLabel">Department</label>
                        <select
                            className="admInput"
                            value={formData.department}
                            onChange={(e) =>
                                setFormData({ ...formData, department: e.target.value })
                            }
                        >
                            <option>Engineering</option>
                            <option>Core Team</option>
                            <option>HR</option>
                            <option>Design</option>
                            <option>Marketing</option>
                            <option>Product</option>
                        </select>
                    </div>

                    <div className="admField">
                        <label className="admLabel">Reporting manager</label>
                        <ReportingManagerSelect
                            value={formData.reportsToId}
                            onChange={(reportsToId) =>
                                setFormData({ ...formData, reportsToId })
                            }
                        />
                        <p
                            style={{
                                marginTop: "0.35rem",
                                fontSize: "0.8rem",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Optional. Shown on profiles and pre-filled on offer letters.
                        </p>
                    </div>

                    <div className="admField" style={{ gridColumn: "1 / -1" }}>
                        <label className="admLabel">Portal role</label>
                        <select
                            className="admInput"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="INTERN">Intern</option>
                            <option value="CONTRACTOR">Contractor</option>
                            <option value="TEAM_LEAD">Team Lead</option>
                            <option value="MANAGER">Manager</option>
                            {currentUserRole === ROLES.FOUNDER && (
                                <>
                                    <option value="HR_ADMIN">HR Admin</option>
                                    <option value="FOUNDER">Super Admin</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                {error && <p className="obError">{error}</p>}

                <div className="obActions">
                    <Link href={isInternFlow ? "/interns" : "/directory"} className="admRefreshBtn">
                        Cancel
                    </Link>
                    <button type="submit" className="admSubmitBtn" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <UserPlus size={18} />
                                {isInternFlow ? "Launch intern journey" : "Complete onboarding"}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function OnboardPage() {
    return (
        <Suspense
            fallback={
                <div className="hubLoading" style={{ padding: "4rem" }}>
                    <Loader2 className="animate-spin" size={32} />
                </div>
            }
        >
            <OnboardForm />
        </Suspense>
    );
}
