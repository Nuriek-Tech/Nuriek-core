"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Calendar,
    Clock,
    GraduationCap,
    Loader2,
    Mail,
    FileSignature,
    UserCheck,
    Briefcase,
    Activity,
    CheckCircle2,
    AlertTriangle,
    ExternalLink,
    BookOpen,
    TrendingUp,
    Star,
} from "lucide-react";
import "@/styles/people-hub.css";
import "../interns.css";
import "./intern-detail.css";
import { reportingManagerDisplayName } from "@/lib/reporting-manager";
import { formatRoleLabel } from "@/lib/roles";

type ChecklistItem = { task: string; done: boolean };

type InternProfileResponse = {
    user: {
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        onboardingStatus: string;
        createdAt: string;
        reportsTo?: {
            id: string;
            name: string | null;
            email: string | null;
            role: string;
        } | null;
    };
    profile: {
        position: string | null;
        department: string | null;
        joinDate: string;
        phoneNumber: string | null;
        bio: string | null;
    } | null;
    performance: {
        learningProgress: number;
        taskCompletion: number;
        score: number;
        duration: string | null;
        conversionRisk: string;
        convertedAt: string | null;
        conversionOfferLetterId: string | null;
    } | null;
    tenure: { startDate: string; daysInSystem: number; label: string };
    attendance: {
        last30DaysCount: number;
        recent: { id: string; checkIn: string; checkOut: string | null; status: string }[];
    };
    offerLetters: {
        id: string;
        refNumber: string;
        status: string;
        position: string;
        department: string;
        createdAt: string;
        emailedAt: string | null;
        signedAt: string | null;
        token: string;
    }[];
    onboardingChecklist: ChecklistItem[];
    canConvert: boolean;
    canSendOffer: boolean;
    isIntern: boolean;
};

function riskClass(risk: string): string {
    const k = (risk || "LOW").toLowerCase();
    if (k === "high") return "internRiskBadge--high";
    if (k === "medium") return "internRiskBadge--medium";
    return "internRiskBadge--low";
}

export default function InternDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const userId = typeof params.id === "string" ? params.id : "";

    const [data, setData] = useState<InternProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [converting, setConverting] = useState(false);
    const [convertOpen, setConvertOpen] = useState(false);
    const [convertForm, setConvertForm] = useState({
        position: "",
        department: "Engineering",
        employmentType: "Full-time",
    });

    const [finishLetterOpen, setFinishLetterOpen] = useState(false);
    const [finishLetterForm, setFinishLetterForm] = useState({
        lastWorkingDate: new Date().toISOString().slice(0, 10),
        toEmail: "",
    });
    const [sendingFinishLetter, setSendingFinishLetter] = useState(false);

    const isAdmin =
        session?.user?.role === "HR_ADMIN" ||
        session?.user?.role === "FOUNDER" ||
        session?.user?.role === "MANAGER" ||
        session?.user?.role === "TEAM_LEAD";

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/interns/${userId}`);
            if (!res.ok) {
                setError(res.status === 404 ? "Intern profile not found." : "Failed to load profile.");
                setData(null);
                return;
            }
            const json: InternProfileResponse = await res.json();
            setData(json);
            setConvertForm((f) => ({
                ...f,
                position: json.profile?.position || "Software Engineer",
                department: json.profile?.department || "Engineering",
            }));
            setFinishLetterForm((f) => ({
                ...f,
                toEmail: json.user.email || "",
            }));
        } catch {
            setError("Failed to load profile.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (status === "loading") return;
        if (!session?.user) {
            router.replace("/login");
            return;
        }
        load();
    }, [status, session, load, router]);

    const handleConvert = async () => {
        if (!data) return;
        setConverting(true);
        try {
            const res = await fetch(`/api/interns/${userId}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(convertForm),
            });
            const json = await res.json();
            if (!res.ok) {
                alert(json?.error || "Conversion failed");
                return;
            }
            setConvertOpen(false);
            router.push(json.offerLetterPath);
        } catch {
            alert("Conversion failed. Please try again.");
        } finally {
            setConverting(false);
        }
    };

    const goToOfferLetter = () => {
        if (!data) return;
        const q = new URLSearchParams();
        q.set("fromIntern", data.user.id);
        q.set("candidateName", data.user.name || "");
        if (data.user.email) q.set("candidateEmail", data.user.email);
        if (convertForm.position || data.profile?.position) {
            q.set("position", convertForm.position || data.profile?.position || "");
        }
        if (convertForm.department || data.profile?.department) {
            q.set("department", convertForm.department || data.profile?.department || "");
        }
        if (convertForm.employmentType) {
            q.set("employmentType", convertForm.employmentType);
        }
        router.push(`/admin/offer-letter?${q.toString()}`);
    };

    const handleSendFinishLetter = async () => {
        if (!data) return;
        setSendingFinishLetter(true);
        try {
            const res = await fetch(`/api/admin/interns/${userId}/finish-letter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finishLetterForm),
            });
            const json = await res.json();
            if (!res.ok) {
                alert(json?.error || "Failed to send finish letter");
                return;
            }
            alert("Finish letter sent successfully!");
            setFinishLetterOpen(false);
        } catch {
            alert("Failed to send finish letter. Please try again.");
        } finally {
            setSendingFinishLetter(false);
        }
    };

    if (loading || status === "loading") {
        return (
            <div className="hubPage">
                <div className="hubLoading">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="hubPage">
                <Link href="/interns" className="internDetailBack">
                    <ArrowLeft size={18} /> Back to interns
                </Link>
                <div className="internEmpty">
                    <GraduationCap size={48} className="hubEmptyIcon" />
                    <p>{error || "Profile not found."}</p>
                </div>
            </div>
        );
    }

    const perf = data.performance;
    const riskKey = perf?.conversionRisk ?? "LOW";
    const doneCount = data.onboardingChecklist.filter((i) => i.done).length;
    const joinDisplay = new Date(data.tenure.startDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <div className="hubPage internDetailPage">
            <header className="hubPageHeader">
                <Link href="/interns" className="internDetailBack">
                    <ArrowLeft size={18} /> Intern cohort
                </Link>
                <div className="internDetailHero glass">
                    <div className="internDetailHeroMain">
                        <div className="internAvatar internAvatar--lg">
                            {data.user.name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                            <h1 className="hubPageTitle">{data.user.name}</h1>
                            <p className="internDetailSubtitle">
                                {data.profile?.position || "Intern"}
                                {data.profile?.department ? ` · ${data.profile.department}` : ""}
                            </p>
                            {data.user.email && (
                                <p className="internDetailEmail">
                                    <Mail size={14} /> {data.user.email}
                                </p>
                            )}
                            {data.user.reportsTo && (
                                <p className="internDetailEmail">
                                    Reports to{" "}
                                    <Link href={`/profile/${data.user.reportsTo.id}`}>
                                        {reportingManagerDisplayName(data.user.reportsTo)}
                                    </Link>
                                    <span style={{ opacity: 0.65 }}>
                                        {" "}
                                        · {formatRoleLabel(data.user.reportsTo.role)}
                                    </span>
                                </p>
                            )}
                            <div className="internDetailBadges">
                                {data.isIntern ? (
                                    <span className="internDetailBadge internDetailBadge--intern">
                                        <GraduationCap size={14} /> Active intern
                                    </span>
                                ) : (
                                    <span className="internDetailBadge internDetailBadge--employee">
                                        <UserCheck size={14} /> Employee
                                    </span>
                                )}
                                {perf?.convertedAt && (
                                    <span className="internDetailBadge internDetailBadge--muted">
                                        Converted{" "}
                                        {new Date(perf.convertedAt).toLocaleDateString("en-IN")}
                                    </span>
                                )}
                                <span className={`internRiskBadge ${riskClass(riskKey)}`}>
                                    <AlertTriangle size={12} />
                                    {riskKey} risk
                                </span>
                            </div>
                        </div>
                    </div>
                    {isAdmin && data.canConvert && (
                        <button
                            type="button"
                            className="hubBtnPrimary internDetailConvertBtn"
                            onClick={() => setConvertOpen(true)}
                        >
                            <UserCheck size={18} />
                            Convert to employee
                        </button>
                    )}
                    {isAdmin && data.canSendOffer && !data.canConvert && (
                        <button
                            type="button"
                            className="hubBtnPrimary internDetailConvertBtn"
                            onClick={goToOfferLetter}
                        >
                            <FileSignature size={18} />
                            Send employment letter
                        </button>
                    )}
                    {isAdmin && data.isIntern && (
                        <button
                            type="button"
                            className="hubBtnSecondary internDetailConvertBtn"
                            onClick={() => setFinishLetterOpen(true)}
                        >
                            <FileSignature size={18} />
                            Send finish letter
                        </button>
                    )}
                </div>
            </header>

            <section className="hubKpiGrid internDetailKpis" aria-label="Tenure and performance">
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">
                        <Clock size={14} /> Days in system
                    </span>
                    <span className="hubKpiValue hubKpiValue--blue">{data.tenure.daysInSystem}</span>
                    <span className="internDetailKpiSub">{data.tenure.label}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">
                        <Calendar size={14} /> Joined
                    </span>
                    <span className="hubKpiValue hubKpiValue--default" style={{ fontSize: "1.25rem" }}>
                        {joinDisplay}
                    </span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">
                        <Star size={14} /> Score
                    </span>
                    <span className="hubKpiValue hubKpiValue--default">{perf?.score ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">
                        <Activity size={14} /> Check-ins (30d)
                    </span>
                    <span className="hubKpiValue hubKpiValue--green">
                        {data.attendance.last30DaysCount}
                    </span>
                </article>
            </section>

            <div className="internDetailGrid">
                <section className="internDetailPanel glass">
                    <h2 className="internDetailPanelTitle">Performance</h2>
                    <div className="internMetrics">
                        <div className="internMetric">
                            <span className="internMetricLabel">
                                <BookOpen size={14} /> Learning
                            </span>
                            <div className="internProgressTrack">
                                <div
                                    className="internProgressFill"
                                    style={{ width: `${perf?.learningProgress || 0}%` }}
                                />
                            </div>
                            <span className="internMetricPct internMetricPct--learn">
                                {perf?.learningProgress || 0}%
                            </span>
                        </div>
                        <div className="internMetric">
                            <span className="internMetricLabel">
                                <TrendingUp size={14} /> Tasks
                            </span>
                            <div className="internProgressTrack">
                                <div
                                    className="internProgressFill internProgressFill--tasks"
                                    style={{ width: `${perf?.taskCompletion || 0}%` }}
                                />
                            </div>
                            <span className="internMetricPct internMetricPct--tasks">
                                {perf?.taskCompletion || 0}%
                            </span>
                        </div>
                    </div>
                    {perf?.duration && (
                        <p className="internDetailMeta">
                            <Briefcase size={14} /> {perf.duration}
                        </p>
                    )}
                    <Link
                        href={`/profile/${data.user.id}`}
                        className="internDetailLink"
                    >
                        Full employee profile <ExternalLink size={14} />
                    </Link>
                </section>

                <section className="internDetailPanel glass">
                    <h2 className="internDetailPanelTitle">
                        Onboarding ({doneCount}/{data.onboardingChecklist.length})
                    </h2>
                    {data.onboardingChecklist.length === 0 ? (
                        <p className="internDetailEmpty">No checklist items yet.</p>
                    ) : (
                        <ul className="internChecklist internChecklist--detail">
                            {data.onboardingChecklist.map((item, idx) => (
                                <li
                                    key={idx}
                                    className={`internCheckItem ${item.done ? "internCheckItem--done" : ""}`}
                                >
                                    {item.done ? (
                                        <CheckCircle2 size={16} className="internCheckIcon--done" />
                                    ) : (
                                        <Activity size={16} className="internCheckIcon" />
                                    )}
                                    <span>{item.task}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="internDetailPanel glass internDetailPanel--wide">
                    <h2 className="internDetailPanelTitle">Employment letters</h2>
                    {data.offerLetters.length === 0 ? (
                        <p className="internDetailEmpty">
                            No offer or employment letters yet.
                            {isAdmin && data.canConvert && " Convert to employee to generate one."}
                        </p>
                    ) : (
                        <div className="internOfferTableWrap">
                            <table className="internOfferTable">
                                <thead>
                                    <tr>
                                        <th>Ref</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Sent</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.offerLetters.map((o) => (
                                        <tr key={o.id}>
                                            <td>{o.refNumber}</td>
                                            <td>
                                                {o.position}
                                                <span className="internOfferDept">{o.department}</span>
                                            </td>
                                            <td>
                                                <span className={`internOfferStatus internOfferStatus--${o.status.toLowerCase()}`}>
                                                    {o.status.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td>
                                                {o.emailedAt
                                                    ? new Date(o.emailedAt).toLocaleDateString("en-IN")
                                                    : "—"}
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/offer/${o.token}`}
                                                    target="_blank"
                                                    className="internDetailLink"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {convertOpen && (
                <div
                    className="internConvertOverlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="convert-title"
                >
                    <div className="internConvertModal glass">
                        <h2 id="convert-title" className="internDetailPanelTitle">
                            Convert to employee
                        </h2>
                        <p className="internConvertDesc">
                            This updates their role to Employee and opens the offer letter generator
                            with their details pre-filled so you can send the employment letter.
                        </p>
                        <label className="internFormLabel">Department</label>
                        <input
                            className="internFormInput"
                            value={convertForm.department}
                            onChange={(e) =>
                                setConvertForm((f) => ({ ...f, department: e.target.value }))
                            }
                        />
                        <label className="internFormLabel">Position</label>
                        <input
                            className="internFormInput"
                            value={convertForm.position}
                            onChange={(e) =>
                                setConvertForm((f) => ({ ...f, position: e.target.value }))
                            }
                        />
                        <label className="internFormLabel">Employment type</label>
                        <select
                            className="internFormSelect"
                            value={convertForm.employmentType}
                            onChange={(e) =>
                                setConvertForm((f) => ({ ...f, employmentType: e.target.value }))
                            }
                        >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                        </select>
                        <div className="internFormActions">
                            <button
                                type="button"
                                className="internSaveBtn"
                                onClick={handleConvert}
                                disabled={converting}
                            >
                                {converting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <FileSignature size={16} />
                                        Convert & open offer letter
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="internCancelBtn"
                                onClick={() => setConvertOpen(false)}
                                disabled={converting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {finishLetterOpen && (
                <div
                    className="internConvertOverlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="finish-title"
                >
                    <div className="internConvertModal glass">
                        <h2 id="finish-title" className="internDetailPanelTitle">
                            Send Finish Letter
                        </h2>
                        <p className="internConvertDesc">
                            Generate and email an internship completion letter.
                        </p>
                        <label className="internFormLabel">Last Working Date</label>
                        <input
                            type="date"
                            className="internFormInput"
                            value={finishLetterForm.lastWorkingDate}
                            onChange={(e) =>
                                setFinishLetterForm((f) => ({ ...f, lastWorkingDate: e.target.value }))
                            }
                        />
                        <label className="internFormLabel">Recipient Email</label>
                        <input
                            type="email"
                            className="internFormInput"
                            value={finishLetterForm.toEmail}
                            onChange={(e) =>
                                setFinishLetterForm((f) => ({ ...f, toEmail: e.target.value }))
                            }
                        />
                        <div className="internFormActions">
                            <button
                                type="button"
                                className="internSaveBtn"
                                onClick={handleSendFinishLetter}
                                disabled={sendingFinishLetter}
                            >
                                {sendingFinishLetter ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        Send Email
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="internCancelBtn"
                                onClick={() => setFinishLetterOpen(false)}
                                disabled={sendingFinishLetter}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
