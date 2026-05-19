"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { isValidHrSignatureDataUrl } from "@/lib/offer-hr-signature-validate";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    FileSignature,
    Loader2,
    Download,
    Eye,
    User,
    Briefcase,
    Calendar,
    MapPin,
    PenLine,
    X,
    ExternalLink,
    Mail,
    Users,
    CheckCircle2,
} from "lucide-react";
import "@/styles/people-hub.css";
import "../documents/admin-documents.css";
import "./offer-letter.css";
import { hasHrPermission } from "@/lib/hr-permissions";
import {
    OFFER_DEPARTMENTS,
    getGradeOptions,
    getPositionsForDepartment,
    getCompensationHintForGrade,
    getOfferFormReadiness,
    roleDefaultsForDepartment,
    roleDefaultsForPosition,
} from "@/lib/offer-role-catalog";
import OfferLetterWorkflow from "@/components/OfferLetterWorkflow";
import ReportingManagerSelect from "@/components/ReportingManagerSelect";
import { reportingManagerDisplayName } from "@/lib/reporting-manager";
import {
    INTERNSHIP_TYPES,
    INTERNSHIP_DURATION_OPTIONS,
    DEFAULT_STIPEND_AFTER_MONTHS,
    type InternshipType,
    internshipTypeLabel,
    isUnpaidInternship,
} from "@/lib/internship-offer";
import {
    clearHrSignatoryPrefs,
    hasSavedHrSignatoryPrefs,
    loadHrSignatoryPrefs,
    loadLegacySignatureOnly,
    saveHrSignatoryPrefs,
} from "@/lib/offer-hr-signatory-prefs";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Intern", "Contract"];

const INITIAL_DEPT = "Engineering";
const INITIAL_ROLE = roleDefaultsForDepartment(INITIAL_DEPT);

function defaultValidUntil() {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
}

function defaultJoiningDate() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
}

export default function OfferLetterPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [generating, setGenerating] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [lastRef, setLastRef] = useState<string | null>(null);
    const [offerToken, setOfferToken] = useState<string | null>(null);
    const [emailOpen, setEmailOpen] = useState(false);
    const [emailTo, setEmailTo] = useState("");
    const [directoryUserId, setDirectoryUserId] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailMsg, setEmailMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);
    const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [workflowTick, setWorkflowTick] = useState(0);
    const [directoryUsers, setDirectoryUsers] = useState<
        {
            id: string;
            name: string | null;
            email: string | null;
            role: string;
            reportsTo?: { id: string; name: string | null; email: string | null } | null;
        }[]
    >([]);
    const [reportingManagerId, setReportingManagerId] = useState("");

    const [form, setForm] = useState({
        candidateName: "",
        candidateEmail: "",
        candidateAddress: "",
        candidateCity: "Bangalore",
        position: INITIAL_ROLE.position,
        department: INITIAL_DEPT,
        employmentType: "Full-time",
        internshipType: INTERNSHIP_TYPES.PAID as InternshipType,
        internshipMonths: "6",
        stipendAfterMonths: String(DEFAULT_STIPEND_AFTER_MONTHS),
        compensation: INITIAL_ROLE.compensation,
        salaryGrade: INITIAL_ROLE.salaryGrade,
        bonusNote: "",
        joiningDate: defaultJoiningDate(),
        reportingTo: "",
        workLocation: "Bangalore (HQ)",
        probationMonths: "3",
        offerValidUntil: defaultValidUntil(),
        hrSignatory: "",
        hrSignatoryTitle: "Human Resources",
        hrSignatureDataUrl: "",
        additionalTerms: "",
    });

    const [hrPrefsLoaded, setHrPrefsLoaded] = useState(false);
    const [hrMigrationPending, setHrMigrationPending] = useState(false);
    const hrServerSaveReady = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const loadPrefs = async () => {
            const saved = loadHrSignatoryPrefs();
            const legacySig = loadLegacySignatureOnly();
            let server: {
                hrSignatory?: string;
                hrSignatoryTitle?: string;
                hrSignatureDataUrl?: string;
            } | null = null;

            try {
                const res = await fetch("/api/admin/offer-letter/hr-signatory");
                if (res.ok) {
                    server = await res.json();
                    if (res.headers.get("X-Nuriek-Migration-Pending")) {
                        setHrMigrationPending(true);
                    }
                }
            } catch {
                /* offline */
            }

            if (cancelled) return;

            setForm((f) => ({
                ...f,
                hrSignatory:
                    saved?.hrSignatory ||
                    server?.hrSignatory ||
                    f.hrSignatory ||
                    session?.user?.name ||
                    "",
                hrSignatoryTitle:
                    saved?.hrSignatoryTitle ||
                    server?.hrSignatoryTitle ||
                    f.hrSignatoryTitle,
                hrSignatureDataUrl:
                    saved?.hrSignatureDataUrl ||
                    legacySig ||
                    server?.hrSignatureDataUrl ||
                    f.hrSignatureDataUrl,
            }));
            setHrPrefsLoaded(true);
            window.setTimeout(() => {
                hrServerSaveReady.current = true;
            }, 0);
        };

        void loadPrefs();
        return () => {
            cancelled = true;
        };
    }, [session?.user?.name]);

    useEffect(() => {
        if (!hrPrefsLoaded) return;
        saveHrSignatoryPrefs({
            hrSignatory: form.hrSignatory,
            hrSignatoryTitle: form.hrSignatoryTitle,
            hrSignatureDataUrl: form.hrSignatureDataUrl,
        });

        if (!hrServerSaveReady.current || hrMigrationPending) return;

        const sig = form.hrSignatureDataUrl.trim();
        if (sig && !isValidHrSignatureDataUrl(sig)) return;

        const timer = window.setTimeout(() => {
            void fetch("/api/admin/offer-letter/hr-signatory", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hrSignatory: form.hrSignatory,
                    hrSignatoryTitle: form.hrSignatoryTitle,
                    hrSignatureDataUrl: form.hrSignatureDataUrl,
                }),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        if (data?.error?.includes("migrate deploy")) {
                            setHrMigrationPending(true);
                        }
                    }
                })
                .catch(() => undefined);
        }, 800);

        return () => window.clearTimeout(timer);
    }, [
        hrPrefsLoaded,
        hrMigrationPending,
        form.hrSignatory,
        form.hrSignatoryTitle,
        form.hrSignatureDataUrl,
    ]);

    const clearSavedHrSignatory = () => {
        clearHrSignatoryPrefs();
        setForm((f) => ({
            ...f,
            hrSignatory: "",
            hrSignatoryTitle: "Human Resources",
            hrSignatureDataUrl: "",
        }));
        void fetch("/api/admin/offer-letter/hr-signatory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                hrSignatory: "",
                hrSignatoryTitle: "Human Resources",
                hrSignatureDataUrl: "",
            }),
        }).catch(() => undefined);
    };

    const savedHrSignatoryActive = hasSavedHrSignatoryPrefs({
        hrSignatory: form.hrSignatory,
        hrSignatoryTitle: form.hrSignatoryTitle,
        hrSignatureDataUrl: form.hrSignatureDataUrl,
    });

    useEffect(() => {
        if (status === "loading") return;
        if (!hasHrPermission(session?.user?.role, session?.user?.hrPermissions, "offer_letter")) {
            router.replace("/dashboard");
        }
    }, [session, status, router]);

    useEffect(() => {
        fetch("/api/config/public")
            .then((r) => r.json())
            .then((d) => {
                if (d?.officeName) {
                    setForm((f) =>
                        f.workLocation === "Bangalore (HQ)"
                            ? { ...f, workLocation: d.officeName }
                            : f
                    );
                }
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        const candidateName = searchParams.get("candidateName");
        if (!candidateName) return;

        const department = searchParams.get("department") || INITIAL_DEPT;
        const deptValid = OFFER_DEPARTMENTS.includes(
            department as (typeof OFFER_DEPARTMENTS)[number]
        )
            ? department
            : INITIAL_DEPT;
        const position =
            searchParams.get("position") ||
            roleDefaultsForDepartment(deptValid).position;
        const roleDefaults = roleDefaultsForPosition(deptValid, position);

        setForm((f) => ({
            ...f,
            candidateName,
            candidateEmail: searchParams.get("candidateEmail") || f.candidateEmail,
            department: deptValid,
            position,
            employmentType:
                searchParams.get("employmentType") || f.employmentType || "Full-time",
            compensation: roleDefaults.compensation,
            salaryGrade: roleDefaults.salaryGrade,
        }));

        const fromIntern = searchParams.get("fromIntern");
        if (fromIntern) {
            setDirectoryUserId(fromIntern);
        }
        const email = searchParams.get("candidateEmail");
        if (email) {
            setEmailTo(email);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!previewOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPreviewOpen(false);
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [previewOpen]);

    const update = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    const positionOptions = useMemo(
        () => getPositionsForDepartment(form.department),
        [form.department]
    );

    const gradeOptions = useMemo(
        () => getGradeOptions(form.department, form.position),
        [form.department, form.position]
    );

    const formReadiness = useMemo(
        () =>
            getOfferFormReadiness({
                candidateName: form.candidateName,
                department: form.department,
                position: form.position,
                salaryGrade: form.salaryGrade,
                compensation: form.compensation,
            }),
        [form.candidateName, form.department, form.position, form.salaryGrade, form.compensation]
    );

    const formComplete = formReadiness.ready;

    // Keep grade & compensation in sync when department/position changes
    useEffect(() => {
        if (!form.department || !form.position) return;
        const grades = getGradeOptions(form.department, form.position);
        if (grades.length === 0) return;

        const gradeValid = grades.some((g) => g.code === form.salaryGrade);
        if (gradeValid && form.compensation.trim()) return;

        const defaults = roleDefaultsForPosition(form.department, form.position);
        setForm((f) => ({
            ...f,
            salaryGrade: gradeValid ? f.salaryGrade : defaults.salaryGrade,
            compensation:
                f.compensation.trim() ||
                defaults.compensation ||
                getCompensationHintForGrade(
                    f.department,
                    f.position,
                    gradeValid ? f.salaryGrade : defaults.salaryGrade
                ) ||
                "",
        }));
    }, [form.department, form.position, form.salaryGrade, form.compensation]);

    const handleDepartmentChange = (department: string) => {
        const defaults = roleDefaultsForDepartment(department);
        setForm((f) => ({
            ...f,
            department,
            position: defaults.position,
            salaryGrade: defaults.salaryGrade,
            compensation: defaults.compensation || f.compensation,
        }));
    };

    const handlePositionChange = (position: string) => {
        const defaults = roleDefaultsForPosition(form.department, position);
        const isIntern = position.toLowerCase().includes("intern");
        setForm((f) => ({
            ...f,
            position,
            salaryGrade: defaults.salaryGrade,
            compensation: defaults.compensation || f.compensation,
            employmentType: isIntern ? "Intern" : f.employmentType === "Intern" ? "Full-time" : f.employmentType,
            internshipType: isIntern ? f.internshipType || INTERNSHIP_TYPES.PAID : INTERNSHIP_TYPES.PAID,
        }));
    };

    const handleEmploymentTypeChange = (employmentType: string) => {
        setForm((f) => ({
            ...f,
            employmentType,
            internshipType:
                employmentType === "Intern"
                    ? f.internshipType || INTERNSHIP_TYPES.PAID
                    : INTERNSHIP_TYPES.PAID,
        }));
    };

    const handleInternshipTypeChange = (internshipType: InternshipType) => {
        setForm((f) => ({
            ...f,
            internshipType,
            compensation:
                internshipType === INTERNSHIP_TYPES.UNPAID && !f.compensation.trim()
                    ? ""
                    : f.compensation,
        }));
    };

    const isInternOffer = form.employmentType === "Intern";
    const isUnpaidInternOffer = isInternOffer && isUnpaidInternship(form.internshipType);

    const handleSalaryGradeChange = (salaryGrade: string) => {
        const hint = getCompensationHintForGrade(form.department, form.position, salaryGrade);
        setForm((f) => ({
            ...f,
            salaryGrade,
            ...(hint ? { compensation: hint } : {}),
        }));
    };

    const generate = useCallback(
        async (opts: { openInNewTab?: boolean; showModal?: boolean }) => {
            const readiness = getOfferFormReadiness({
                candidateName: form.candidateName,
                department: form.department,
                position: form.position,
                salaryGrade: form.salaryGrade,
                compensation: form.compensation,
                employmentType: form.employmentType,
                internshipType: form.internshipType,
                internshipMonths: form.internshipMonths,
            });
            if (!readiness.ready) {
                alert(`Please complete: ${readiness.missing.join(", ")}`);
                return;
            }

            setGenerating(true);
            try {
                const res = await fetch("/api/admin/offer-letter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        compensation: readiness.compensation,
                        probationMonths: Number(form.probationMonths) || 3,
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || "Failed to generate offer letter");
                    return;
                }

                if (!data.html) {
                    alert(data.error || "No offer letter content returned");
                    return;
                }

                setPreviewHtml(data.html);
                setLastRef(data.refNumber);
                if (data.token) setOfferToken(data.token);
                else setOfferToken(null);
                if (form.candidateEmail) setEmailTo(form.candidateEmail);
                setWorkflowTick((t) => t + 1);

                if (data.warning) {
                    alert(data.warning);
                }

                if (opts.showModal) {
                    setPreviewOpen(true);
                }

                if (opts.openInNewTab) {
                    const w = window.open("", "_blank");
                    if (w) {
                        w.document.write(data.html);
                        w.document.close();
                    } else {
                        alert("Allow pop-ups to open the offer letter in a new tab.");
                    }
                }
            } catch {
                alert("Failed to generate offer letter");
            } finally {
                setGenerating(false);
            }
        },
        [form]
    );

    useEffect(() => {
        if (directoryUsers.length > 0) return;
        fetch("/api/users")
            .then((r) => (r.ok ? r.json() : []))
            .then((list) => setDirectoryUsers(Array.isArray(list) ? list : []))
            .catch(() => undefined);
    }, [directoryUsers.length]);

    const applyReportingFromUser = useCallback(
        (userId: string) => {
            const u = directoryUsers.find((x) => x.id === userId);
            if (!u?.reportsTo) return;
            setReportingManagerId(u.reportsTo.id);
            update("reportingTo", reportingManagerDisplayName(u.reportsTo));
        },
        [directoryUsers]
    );

    useEffect(() => {
        const fromIntern = searchParams.get("fromIntern");
        if (fromIntern && directoryUsers.length > 0) {
            applyReportingFromUser(fromIntern);
        }
    }, [searchParams, directoryUsers, applyReportingFromUser]);

    useEffect(() => {
        if (directoryUserId) applyReportingFromUser(directoryUserId);
    }, [directoryUserId, applyReportingFromUser]);

    useEffect(() => {
        if (!emailOpen || !offerToken) return;
        setEmailPreviewLoading(true);
        setEmailPreviewHtml(null);
        fetch("/api/admin/offer-letter/email-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: offerToken }),
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.emailHtml) {
                    setEmailPreviewHtml(data.emailHtml);
                    setEmailSubject(data.subject ?? "");
                }
            })
            .catch(() => undefined)
            .finally(() => setEmailPreviewLoading(false));
    }, [emailOpen, offerToken]);

    const openEmailModal = () => {
        if (!offerToken) {
            alert("Generate the offer letter first, then send by email.");
            return;
        }
        setEmailTo(form.candidateEmail);
        setEmailMsg(null);
        setEmailOpen(true);
    };

    const sendOfferEmail = async () => {
        if (!offerToken) return;
        setSendingEmail(true);
        setEmailMsg(null);
        try {
            const res = await fetch("/api/admin/offer-letter/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: offerToken,
                    email: emailTo,
                    userId: directoryUserId || undefined,
                    hrSignatory: form.hrSignatory,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEmailMsg({ type: "err", text: data.error || "Failed to send email" });
                return;
            }
            setWorkflowTick((t) => t + 1);
            setEmailMsg(null);
            setEmailOpen(false);
        } catch {
            setEmailMsg({ type: "err", text: "Failed to send email" });
        } finally {
            setSendingEmail(false);
        }
    };

    const onDirectoryPick = (userId: string) => {
        setDirectoryUserId(userId);
        const picked = directoryUsers.find((u) => u.id === userId);
        if (picked?.email) setEmailTo(picked.email);
    };

    if (
        status === "loading" ||
        !hasHrPermission(session?.user?.role, session?.user?.hrPermissions, "offer_letter")
    ) {
        return (
            <div className="olLoadingWrap">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="hubPage admDocs olDocs">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <Link href="/dashboard" className="admBackLink" aria-label="Back to dashboard">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">HR · Hiring</p>
                    <div className="admHeroTitleRow">
                        <h1>
                            Offer Letter <span className="text-gradient">Generator</span>
                        </h1>
                    </div>
                </div>
                <div className="hubHeroActions">
                    {lastRef && (
                        <span className="hubStatChip">
                            <FileSignature size={16} color="var(--nuriek-blue)" />
                            Ref <strong>{lastRef}</strong>
                        </span>
                    )}
                    <span className="hubStatChip">
                        <Briefcase size={16} color="var(--nuriek-blue)" />
                        {isInternOffer
                            ? internshipTypeLabel(
                                  form.internshipType,
                                  Number(form.internshipMonths) || undefined
                              )
                            : form.employmentType}
                    </span>
                </div>
            </header>

            <form
                className="admPanel glass olFormPanel"
                onSubmit={(e) => {
                    e.preventDefault();
                    generate({ openInNewTab: true });
                }}
            >
                <h2 className="admPanelTitle">
                    <span className="admPanelTitleIcon">
                        <FileSignature size={18} />
                    </span>
                    Offer details
                </h2>

                <div className="olFormColumns">
                    <div className="olFormCol">
                        <section className="olSection" aria-labelledby="ol-candidate">
                            <h3 id="ol-candidate" className="olSectionTitle">
                                <User size={14} />
                                Candidate
                            </h3>
                            <div className="olGrid2">
                                <div className="admField olFieldSpan2">
                                    <label className="admLabel" htmlFor="ol-name">
                                        Full name *
                                    </label>
                                    <input
                                        id="ol-name"
                                        required
                                        className="admInput"
                                        value={form.candidateName}
                                        onChange={(e) => update("candidateName", e.target.value)}
                                        placeholder="e.g. Priya Sharma"
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-email">
                                        Email
                                    </label>
                                    <input
                                        id="ol-email"
                                        type="email"
                                        className="admInput"
                                        value={form.candidateEmail}
                                        onChange={(e) => update("candidateEmail", e.target.value)}
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-city">
                                        City
                                    </label>
                                    <input
                                        id="ol-city"
                                        className="admInput"
                                        value={form.candidateCity}
                                        onChange={(e) => update("candidateCity", e.target.value)}
                                    />
                                </div>
                                <div className="admField olFieldSpan2">
                                    <label className="admLabel" htmlFor="ol-address">
                                        Address (optional)
                                    </label>
                                    <textarea
                                        id="ol-address"
                                        className="admTextarea olTextareaCompact"
                                        value={form.candidateAddress}
                                        onChange={(e) => update("candidateAddress", e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="olSection" aria-labelledby="ol-dates">
                            <h3 id="ol-dates" className="olSectionTitle">
                                <Calendar size={14} />
                                Dates & location
                            </h3>
                            <div className="olGrid2">
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-join">
                                        Joining date *
                                    </label>
                                    <input
                                        id="ol-join"
                                        required
                                        type="date"
                                        className="admInput"
                                        value={form.joiningDate}
                                        onChange={(e) => update("joiningDate", e.target.value)}
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-valid">
                                        Offer valid until *
                                    </label>
                                    <input
                                        id="ol-valid"
                                        required
                                        type="date"
                                        className="admInput"
                                        value={form.offerValidUntil}
                                        onChange={(e) => update("offerValidUntil", e.target.value)}
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-report-mgr">
                                        Reporting manager
                                    </label>
                                    <ReportingManagerSelect
                                        id="ol-report-mgr"
                                        value={reportingManagerId}
                                        onChange={(id) => {
                                            setReportingManagerId(id);
                                            if (!id) return;
                                            fetch("/api/users/managers")
                                                .then((r) => (r.ok ? r.json() : { managers: [] }))
                                                .then((data) => {
                                                    const m = (data.managers || []).find(
                                                        (x: { id: string }) => x.id === id
                                                    );
                                                    if (m) {
                                                        update(
                                                            "reportingTo",
                                                            m.name?.trim() || m.label || ""
                                                        );
                                                    }
                                                })
                                                .catch(() => undefined);
                                        }}
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-report">
                                        Reporting to (on letter)
                                    </label>
                                    <input
                                        id="ol-report"
                                        className="admInput"
                                        value={form.reportingTo}
                                        onChange={(e) => update("reportingTo", e.target.value)}
                                        placeholder="Name as printed on offer"
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-location">
                                        <MapPin size={10} style={{ display: "inline" }} /> Work location
                                    </label>
                                    <input
                                        id="ol-location"
                                        className="admInput"
                                        value={form.workLocation}
                                        onChange={(e) => update("workLocation", e.target.value)}
                                    />
                                </div>
                                {isInternOffer ? (
                                    <>
                                        <div className="admField">
                                            <label className="admLabel" htmlFor="ol-intern-months">
                                                Internship duration *
                                            </label>
                                            <select
                                                id="ol-intern-months"
                                                required
                                                className="admSelect"
                                                value={form.internshipMonths}
                                                onChange={(e) =>
                                                    update("internshipMonths", e.target.value)
                                                }
                                            >
                                                {INTERNSHIP_DURATION_OPTIONS.map((m) => (
                                                    <option key={m} value={String(m)}>
                                                        {m} months
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {isUnpaidInternOffer && (
                                            <div className="admField">
                                                <label className="admLabel" htmlFor="ol-stipend-after">
                                                    Months before stipend review
                                                </label>
                                                <select
                                                    id="ol-stipend-after"
                                                    className="admSelect"
                                                    value={form.stipendAfterMonths}
                                                    onChange={(e) =>
                                                        update("stipendAfterMonths", e.target.value)
                                                    }
                                                >
                                                    {[1, 2, 3, 4, 6].map((m) => (
                                                        <option key={m} value={String(m)}>
                                                            {m} month{m === 1 ? "" : "s"}
                                                        </option>
                                                    ))}
                                                </select>
                                                <span className="olFieldHint">
                                                    Stipend may be offered after this review period.
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="admField">
                                        <label className="admLabel" htmlFor="ol-probation">
                                            Probation (months)
                                        </label>
                                        <input
                                            id="ol-probation"
                                            type="number"
                                            min={0}
                                            max={12}
                                            className="admInput"
                                            value={form.probationMonths}
                                            onChange={(e) =>
                                                update("probationMonths", e.target.value)
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="olFormCol">
                        <section className="olSection" aria-labelledby="ol-role">
                            <h3 id="ol-role" className="olSectionTitle">
                                <Briefcase size={14} />
                                Role & compensation
                            </h3>
                            <div className="olGrid2">
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-dept">
                                        Department *
                                    </label>
                                    <select
                                        id="ol-dept"
                                        required
                                        className="admSelect"
                                        value={form.department}
                                        onChange={(e) => handleDepartmentChange(e.target.value)}
                                    >
                                        {OFFER_DEPARTMENTS.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-position">
                                        Position *
                                    </label>
                                    <select
                                        id="ol-position"
                                        required
                                        className="admSelect"
                                        value={form.position}
                                        onChange={(e) => handlePositionChange(e.target.value)}
                                    >
                                        {positionOptions.map((role) => (
                                            <option key={role.title} value={role.title}>
                                                {role.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-emp-type">
                                        Employment type
                                    </label>
                                    <select
                                        id="ol-emp-type"
                                        className="admSelect"
                                        value={form.employmentType}
                                        onChange={(e) => handleEmploymentTypeChange(e.target.value)}
                                    >
                                        {EMPLOYMENT_TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {isInternOffer && (
                                    <div className="admField olFieldSpan2">
                                        <label className="admLabel">Internship arrangement *</label>
                                        <div className="olInternTypeRow">
                                            <label className="olInternTypeOption">
                                                <input
                                                    type="radio"
                                                    name="internshipType"
                                                    checked={form.internshipType === INTERNSHIP_TYPES.PAID}
                                                    onChange={() =>
                                                        handleInternshipTypeChange(INTERNSHIP_TYPES.PAID)
                                                    }
                                                />
                                                <span>
                                                    <strong>Paid internship</strong>
                                                    <small>Stipend from day one</small>
                                                </span>
                                            </label>
                                            <label className="olInternTypeOption">
                                                <input
                                                    type="radio"
                                                    name="internshipType"
                                                    checked={
                                                        form.internshipType === INTERNSHIP_TYPES.UNPAID
                                                    }
                                                    onChange={() =>
                                                        handleInternshipTypeChange(INTERNSHIP_TYPES.UNPAID)
                                                    }
                                                />
                                                <span>
                                                    <strong>Unpaid internship</strong>
                                                    <small>
                                                        No stipend for first 3 months; paid after review
                                                    </small>
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                                <div className="admField olFieldSpan2">
                                    <label className="admLabel" htmlFor="ol-comp">
                                        {isUnpaidInternOffer
                                            ? "Stipend after 3 months (optional)"
                                            : isInternOffer
                                              ? "Stipend *"
                                              : "Compensation *"}
                                    </label>
                                    <input
                                        id="ol-comp"
                                        required={!isUnpaidInternOffer}
                                        className="admInput"
                                        value={form.compensation}
                                        onChange={(e) => update("compensation", e.target.value)}
                                        placeholder={
                                            isUnpaidInternOffer
                                                ? "e.g. Rs. 25,000 per month (if known)"
                                                : isInternOffer
                                                  ? "Rs. 25,000 per month stipend"
                                                  : "Rs. 12,00,000 per annum"
                                        }
                                    />
                                    <span className="olFieldHint">
                                        {isUnpaidInternOffer
                                            ? "Leave blank if stipend amount is decided after the 3-month review."
                                            : "Suggested from grade — you can edit"}
                                    </span>
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-grade">
                                        Salary grade{isUnpaidInternOffer ? "" : " *"}
                                    </label>
                                    <select
                                        id="ol-grade"
                                        required={!isUnpaidInternOffer}
                                        className="admSelect"
                                        value={form.salaryGrade}
                                        onChange={(e) => handleSalaryGradeChange(e.target.value)}
                                        disabled={gradeOptions.length === 0 || isUnpaidInternOffer}
                                    >
                                        {gradeOptions.map((g) => (
                                            <option key={g.code} value={g.code}>
                                                {g.label}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="olFieldHint">
                                        Updates when you change position
                                    </span>
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-bonus">
                                        Bonus note
                                    </label>
                                    <input
                                        id="ol-bonus"
                                        className="admInput"
                                        value={form.bonusNote}
                                        onChange={(e) => update("bonusNote", e.target.value)}
                                        placeholder="includes 16% variable"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="olSection" aria-labelledby="ol-hr">
                            <div className="olSectionTitleRow">
                                <h3 id="ol-hr" className="olSectionTitle">
                                    <PenLine size={14} />
                                    Signatory & terms
                                </h3>
                                {savedHrSignatoryActive && (
                                    <button
                                        type="button"
                                        className="olBtnSecondary olBtnSecondary--sm"
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    "Clear saved HR signatory name, title, and signature? This applies to all future offers until you set them again."
                                                )
                                            ) {
                                                clearSavedHrSignatory();
                                            }
                                        }}
                                    >
                                        Clear saved signatory
                                    </button>
                                )}
                            </div>
                            {hrMigrationPending && (
                                <p className="olFieldHint olHrPrefsNote" role="status">
                                    Database migration pending — signature is saved in this browser only.
                                    Run <code>npx prisma migrate deploy</code> on production, then redeploy.
                                </p>
                            )}
                            <p className="olFieldHint olHrPrefsNote">
                                Name, title, and signature are saved to the server (and this browser) and
                                reused for every offer letter until you clear them.
                            </p>
                            <div className="olGrid2">
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-hr-name">
                                        HR signatory
                                    </label>
                                    <input
                                        id="ol-hr-name"
                                        className="admInput"
                                        value={form.hrSignatory}
                                        onChange={(e) => update("hrSignatory", e.target.value)}
                                    />
                                </div>
                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-hr-title">
                                        Signatory title
                                    </label>
                                    <input
                                        id="ol-hr-title"
                                        className="admInput"
                                        value={form.hrSignatoryTitle}
                                        onChange={(e) => update("hrSignatoryTitle", e.target.value)}
                                    />
                                </div>
                                <div className="admField olFieldSpan2">
                                    <label className="admLabel" htmlFor="ol-hr-sig">
                                        HR signature image
                                    </label>
                                    <input
                                        id="ol-hr-sig"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="admInput"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 600_000) {
                                                alert("Signature image must be under 600 KB.");
                                                e.target.value = "";
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                update("hrSignatureDataUrl", String(reader.result || ""));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                    {form.hrSignatureDataUrl ? (
                                        <div className="olHrSigPreview">
                                            <img
                                                src={form.hrSignatureDataUrl}
                                                alt="HR signature preview"
                                            />
                                            <button
                                                type="button"
                                                className="olBtnSecondary"
                                                style={{ marginTop: "0.5rem" }}
                                                onClick={() => update("hrSignatureDataUrl", "")}
                                            >
                                                Remove signature image
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="olFieldHint">
                                            Upload PNG/JPG (transparent background works best). Saved to
                                            the server for production — or place{" "}
                                            <code>public/images/nuriek-hr-signature.png</code> in the
                                            repo as a fallback.
                                        </span>
                                    )}
                                </div>
                                <div className="admField olFieldSpan2">
                                    <label className="admLabel" htmlFor="ol-terms">
                                        Additional terms (optional)
                                    </label>
                                    <textarea
                                        id="ol-terms"
                                        className="admTextarea olTextareaCompact"
                                        value={form.additionalTerms}
                                        onChange={(e) => update("additionalTerms", e.target.value)}
                                        placeholder="Custom clauses or notes…"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="olActions">
                    {!formComplete && formReadiness.missing.length > 0 && (
                        <p className="olFormStatus" role="status">
                            To preview or generate, add: {formReadiness.missing.join(", ")}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={generating || !formComplete}
                        className="admSubmitBtn"
                    >
                        {generating ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Download size={18} />
                        )}
                        Generate & open PDF
                    </button>
                    <button
                        type="button"
                        disabled={generating || !formComplete}
                        className="olBtnSecondary"
                        onClick={() => generate({ showModal: true })}
                    >
                        <Eye size={18} />
                        Preview
                    </button>
                    <button
                        type="button"
                        disabled={!offerToken || sendingEmail}
                        className="olBtnSecondary olBtnEmail"
                        onClick={openEmailModal}
                        title={offerToken ? "Email offer to candidate" : "Generate offer first"}
                    >
                        <Mail size={18} />
                        Email offer
                    </button>
                </div>
            </form>

            <OfferLetterWorkflow key={workflowTick} />

            {previewOpen &&
                previewHtml &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="olModalBackdrop"
                        role="presentation"
                        onClick={() => setPreviewOpen(false)}
                    >
                        <div
                            className="olModal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ol-preview-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="olModalHead">
                            <div>
                                <h2 id="ol-preview-title" className="olModalTitle">
                                    Offer letter preview
                                </h2>
                                {lastRef && (
                                    <span className="olRefBadge olRefBadge--inline">
                                        <FileSignature size={14} />
                                        {lastRef}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                className="olModalClose"
                                onClick={() => setPreviewOpen(false)}
                                aria-label="Close preview"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="olPreviewBody">
                            <iframe
                                title="Offer letter preview"
                                srcDoc={previewHtml}
                                className="olPreviewFrame"
                            />
                        </div>

                        <footer className="olModalFoot">
                            <button
                                type="button"
                                className="olBtnSecondary"
                                onClick={() => setPreviewOpen(false)}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="olBtnSecondary"
                                onClick={() => {
                                    setPreviewOpen(false);
                                    generate({ openInNewTab: true });
                                }}
                                disabled={generating || !formComplete}
                            >
                                <ExternalLink size={18} />
                                Open PDF tab
                            </button>
                            <button
                                type="button"
                                className="olBtnSecondary"
                                onClick={() => {
                                    setPreviewOpen(false);
                                    openEmailModal();
                                }}
                                disabled={!offerToken}
                            >
                                <Mail size={18} />
                                Email offer
                            </button>
                            <button
                                type="button"
                                className="admSubmitBtn olModalPrimary"
                                onClick={() => setPreviewOpen(false)}
                            >
                                Edit & generate again
                            </button>
                        </footer>
                        </div>
                    </div>,
                    document.body
                )}

            {emailOpen &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="olEmailBackdrop"
                        role="presentation"
                        onClick={() => setEmailOpen(false)}
                    >
                        <div
                            className="olEmailModal glass olEmailModal--wide"
                            role="dialog"
                            aria-labelledby="ol-email-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <header className="olEmailHead">
                                <h2 id="ol-email-title" className="olEmailTitle">
                                    <Mail size={20} />
                                    Send offer by email
                                </h2>
                                <button
                                    type="button"
                                    className="olModalClose"
                                    onClick={() => setEmailOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </header>

                            <div className="olEmailPreviewSection">
                                <p className="olEmailPreviewLabel">
                                    Email preview (what the candidate receives)
                                </p>
                                {emailSubject && (
                                    <p className="olEmailSubject">
                                        Subject: <strong>{emailSubject}</strong>
                                    </p>
                                )}
                                <div className="olEmailPreviewFrameWrap">
                                    {emailPreviewLoading ? (
                                        <div className="olEmailPreviewLoading">
                                            <Loader2 className="animate-spin" size={24} />
                                        </div>
                                    ) : emailPreviewHtml ? (
                                        <iframe
                                            title="Email preview"
                                            srcDoc={emailPreviewHtml}
                                            className="olEmailPreviewFrame"
                                        />
                                    ) : (
                                        <p className="olEmailPreviewLoading">Could not load preview</p>
                                    )}
                                </div>
                            </div>

                            <div className="olEmailBody">
                                <p className="olEmailLead">
                                    nuriek-branded welcome email with a link to view and sign the
                                    offer. Status updates appear in the workflow table on this page.
                                </p>

                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-dir-user">
                                        <Users size={12} style={{ display: "inline" }} /> From
                                        directory (optional)
                                    </label>
                                    <select
                                        id="ol-dir-user"
                                        className="admSelect"
                                        value={directoryUserId}
                                        onChange={(e) => onDirectoryPick(e.target.value)}
                                    >
                                        <option value="">— Select employee —</option>
                                        {directoryUsers.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name || u.email} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="admField">
                                    <label className="admLabel" htmlFor="ol-email-to">
                                        Recipient email *
                                    </label>
                                    <input
                                        id="ol-email-to"
                                        type="email"
                                        className="admInput"
                                        value={emailTo}
                                        onChange={(e) => setEmailTo(e.target.value)}
                                        placeholder="candidate@email.com"
                                    />
                                </div>

                                {lastRef && (
                                    <p className="olEmailRef">
                                        Offer ref: <strong>{lastRef}</strong>
                                        {offerToken && (
                                            <>
                                                {" "}
                                                ·{" "}
                                                <a
                                                    href={`/offer/${offerToken}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Preview link
                                                </a>
                                            </>
                                        )}
                                    </p>
                                )}

                                {emailMsg && (
                                    <p
                                        className={`olEmailMsg olEmailMsg--${emailMsg.type}`}
                                        role="status"
                                    >
                                        {emailMsg.type === "ok" && (
                                            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                                        )}
                                        {emailMsg.text}
                                    </p>
                                )}
                            </div>

                            <footer className="olEmailFoot">
                                <button
                                    type="button"
                                    className="olBtnSecondary"
                                    onClick={() => setEmailOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="admSubmitBtn"
                                    disabled={sendingEmail || !emailTo.trim()}
                                    onClick={sendOfferEmail}
                                >
                                    {sendingEmail ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Mail size={18} />
                                    )}
                                    Send offer email
                                </button>
                            </footer>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
