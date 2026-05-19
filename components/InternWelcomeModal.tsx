"use client";

import { useState } from "react";
import Link from "next/link";
import {
    GraduationCap,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Clock,
    FileText,
    Folder,
    Sparkles,
} from "lucide-react";
import {
    NURIEK_PSYCHOLOGY_INTRO,
    NURIEK_PSYCHOLOGY_PILLARS,
    INTERN_WELCOME_STEPS,
} from "@/lib/nuriek-psychology";
import "./intern-welcome.css";

type Props = {
    userName?: string | null;
    onComplete: () => void;
};

const TOOLKIT = [
    {
        icon: Clock,
        title: "Time Management",
        desc: "Check in, log timesheets, and track your rhythm.",
        href: "/attendance",
    },
    {
        icon: FileText,
        title: "Documents",
        desc: "Sign policies and HR flows assigned to you.",
        href: "/documents",
    },
    {
        icon: Folder,
        title: "Employee Handbook",
        desc: "Policies, templates, and learning resources.",
        href: "/drive",
    },
    {
        icon: GraduationCap,
        title: "Intern hub",
        desc: "Your checklist, score, and growth milestones.",
        href: "/interns",
    },
];

export default function InternWelcomeModal({ userName, onComplete }: Props) {
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    const current = INTERN_WELCOME_STEPS[step];
    const isLast = step === INTERN_WELCOME_STEPS.length - 1;

    const finish = async () => {
        setSaving(true);
        try {
            await fetch("/api/onboarding/complete", { method: "POST" });
            onComplete();
        } catch {
            onComplete();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="iwOverlay" role="dialog" aria-modal="true" aria-labelledby="iw-title">
            <div className="iwModal glass">
                <div className="iwHero">
                    <p className="iwEyebrow">Nuriek Psychology · Intern journey</p>
                    <h2 id="iw-title" className="iwTitle">
                        {current.title}
                        {step === 0 && userName ? `, ${userName.split(" ")[0]}` : ""}
                    </h2>
                    <p className="iwLead">{current.lead}</p>
                </div>

                <div className="iwSteps" aria-hidden>
                    {INTERN_WELCOME_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`iwStepDot ${i <= step ? "iwStepDot--active" : ""}`}
                        />
                    ))}
                </div>

                <div className="iwBody">
                    {step === 0 && (
                        <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                            {NURIEK_PSYCHOLOGY_INTRO}
                        </p>
                    )}

                    {step === 1 && (
                        <div className="iwPillarGrid">
                            {NURIEK_PSYCHOLOGY_PILLARS.map((p) => {
                                const Icon = p.icon;
                                return (
                                    <div key={p.id} className="iwPillar">
                                        <div
                                            className="iwPillarIcon"
                                            style={{ background: p.bg, color: p.color }}
                                        >
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <p className="iwPillarSub">{p.subtitle}</p>
                                            <p className="iwPillarTitle">{p.title}</p>
                                            <p className="iwPillarDesc">{p.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {step === 2 && (
                        <ul className="iwToolkitList">
                            {TOOLKIT.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <li key={t.href}>
                                        <Link href={t.href} className="iwToolkitItem">
                                            <Icon size={18} style={{ color: "var(--nuriek-blue)", flexShrink: 0 }} />
                                            <span>
                                                <strong>{t.title}</strong>
                                                <span>{t.desc}</span>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {step === 3 && (
                        <div style={{ textAlign: "center" }}>
                            <div className="iwBeginIcon">
                                <Sparkles size={36} />
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                                Visit <strong>Intern Management</strong> anytime to see your onboarding
                                checklist and performance score. Your buddy and manager are here to support
                                you — not to judge you.
                            </p>
                        </div>
                    )}
                </div>

                <footer className="iwFooter">
                    {step > 0 ? (
                        <button
                            type="button"
                            className="iwSkip"
                            onClick={() => setStep((s) => s - 1)}
                        >
                            <ArrowLeft size={14} style={{ verticalAlign: "middle" }} /> Back
                        </button>
                    ) : (
                        <button type="button" className="iwSkip" onClick={finish} disabled={saving}>
                            Skip for now
                        </button>
                    )}

                    {isLast ? (
                        <button
                            type="button"
                            className="iwPrimary"
                            onClick={finish}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Enter portal
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="iwPrimary"
                            onClick={() => setStep((s) => s + 1)}
                        >
                            Continue
                            <ArrowRight size={18} />
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
