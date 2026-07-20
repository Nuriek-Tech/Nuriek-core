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
import "../offer-letter/offer-letter.css"; // Reuse offer letter CSS
import { hasHrPermission } from "@/lib/hr-permissions";
import ReportingManagerSelect from "@/components/ReportingManagerSelect";
import { reportingManagerDisplayName } from "@/lib/reporting-manager";
import {
    clearHrSignatoryPrefs,
    hasSavedHrSignatoryPrefs,
    loadHrSignatoryPrefs,
    loadLegacySignatureOnly,
    saveHrSignatoryPrefs,
} from "@/lib/offer-hr-signatory-prefs";

export default function FinishLetterPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [generating, setGenerating] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailMsg, setEmailMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    
    const [directoryUsers, setDirectoryUsers] = useState<
        {
            id: string;
            name: string | null;
            email: string | null;
            role: string;
            reportsTo?: { id: string; name: string | null; email: string | null } | null;
        }[]
    >([]);
    
    const [directoryUserId, setDirectoryUserId] = useState("");
    const [reportingManagerId, setReportingManagerId] = useState("");
    const [previewStale, setPreviewStale] = useState(false);

    const [form, setForm] = useState({
        candidateName: "",
        candidateEmail: "",
        department: "Engineering",
        position: "Intern",
        joiningDate: new Date().toISOString().slice(0, 10),
        lastWorkingDate: new Date().toISOString().slice(0, 10),
        reportingTo: "",
        hrSignatory: "",
        hrSignatoryTitle: "Human Resources",
        hrSignatureDataUrl: "",
    });

    const formRef = useRef(form);
    useEffect(() => {
        formRef.current = form;
    }, [form]);

    const [hrPrefsLoaded, setHrPrefsLoaded] = useState(false);

    useEffect(() => {
        const loadPrefs = async () => {
            const saved = loadHrSignatoryPrefs();
            const legacySig = loadLegacySignatureOnly();
            let server: any = null;

            try {
                const res = await fetch("/api/admin/offer-letter/hr-signatory");
                if (res.ok) {
                    server = await res.json();
                }
            } catch {
                /* offline */
            }

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
        };
        void loadPrefs();
    }, [session?.user?.name]);

    useEffect(() => {
        if (!hrPrefsLoaded) return;
        saveHrSignatoryPrefs({
            hrSignatory: form.hrSignatory,
            hrSignatoryTitle: form.hrSignatoryTitle,
            hrSignatureDataUrl: form.hrSignatureDataUrl,
        });
    }, [hrPrefsLoaded, form.hrSignatory, form.hrSignatoryTitle, form.hrSignatureDataUrl]);

    const clearSavedHrSignatory = () => {
        clearHrSignatoryPrefs();
        setForm((f) => ({
            ...f,
            hrSignatory: "",
            hrSignatoryTitle: "Human Resources",
            hrSignatureDataUrl: "",
        }));
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
        const candidateName = searchParams.get("candidateName");
        if (!candidateName) return;

        setForm((f) => ({
            ...f,
            candidateName,
            candidateEmail: searchParams.get("candidateEmail") || f.candidateEmail,
            department: searchParams.get("department") || f.department,
            position: searchParams.get("position") || f.position,
            joiningDate: searchParams.get("joiningDate") || f.joiningDate,
        }));

        const fromIntern = searchParams.get("fromIntern");
        if (fromIntern) {
            setDirectoryUserId(fromIntern);
        }
    }, [searchParams]);

    const update = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        setPreviewStale(true);
    };

    const preview = useCallback(async () => {
        const current = formRef.current;
        if (!current.candidateName || !current.candidateEmail || !current.lastWorkingDate) {
            alert("Please fill in Name, Email, and Last Working Date.");
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch("/api/admin/finish-letter/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(current),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to generate preview");
                return;
            }

            if (!data.html) {
                alert("No letter content returned");
                return;
            }

            setPreviewHtml(data.html);
            setPreviewStale(false);
            setPreviewOpen(true);
        } catch {
            alert("Failed to generate preview");
        } finally {
            setGenerating(false);
        }
    }, []);

    const sendEmail = useCallback(async () => {
        const current = formRef.current;
        if (!current.candidateName || !current.candidateEmail || !current.lastWorkingDate) {
            alert("Please fill in Name, Email, and Last Working Date.");
            return;
        }

        if (!confirm(`Are you sure you want to send the Finish Letter to ${current.candidateEmail}?`)) {
            return;
        }

        setSendingEmail(true);
        setEmailMsg(null);
        try {
            const res = await fetch("/api/admin/finish-letter/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...current,
                    userId: directoryUserId || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEmailMsg({ type: "err", text: data.error || "Failed to send email" });
                return;
            }
            setEmailMsg({ type: "ok", text: `Finish letter successfully sent to ${data.sentTo}!` });
        } catch {
            setEmailMsg({ type: "err", text: "Failed to send email" });
        } finally {
            setSendingEmail(false);
        }
    }, [directoryUserId]);

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
                    <Link href="/directory" className="admBackLink" aria-label="Back to directory">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">HR · Offboarding</p>
                    <div className="admHeroTitleRow">
                        <h1>
                            Finish Letter <span className="text-gradient">Generator</span>
                        </h1>
                    </div>
                </div>
            </header>

            <div className="olLayout">
                <aside className="olSidebar">
                    {emailMsg && (
                        <div
                            style={{
                                padding: "1rem",
                                borderRadius: "8px",
                                marginBottom: "1.5rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                background: emailMsg.type === "ok" ? "rgba(52, 199, 89, 0.1)" : "rgba(255, 69, 58, 0.1)",
                                color: emailMsg.type === "ok" ? "#34c759" : "#ff453a",
                                border: `1px solid ${emailMsg.type === "ok" ? "rgba(52, 199, 89, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
                            }}
                        >
                            {emailMsg.type === "ok" ? <CheckCircle2 size={20} /> : <X size={20} />}
                            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{emailMsg.text}</span>
                        </div>
                    )}

                    <div className="olFormSection glass">
                        <h2 className="olFormSectionTitle">
                            <User size={16} /> Candidate details
                        </h2>

                        <div className="olFormGroup">
                            <label className="olFormLabel">Link to Intern Profile (Optional)</label>
                            <select
                                className="olFormSelect"
                                value={directoryUserId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setDirectoryUserId(id);
                                    if (id) {
                                        const u = directoryUsers.find((x) => x.id === id);
                                        if (u) {
                                            update("candidateName", u.name || "");
                                            update("candidateEmail", u.email || "");
                                            applyReportingFromUser(id);
                                        }
                                    }
                                }}
                            >
                                <option value="">Select a user profile to auto-fill...</option>
                                {directoryUsers
                                    .filter((u) => u.role === "INTERN")
                                    .map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.email})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="olFormGroup">
                            <label className="olFormLabel">Full name</label>
                            <input
                                className="olFormInput"
                                value={form.candidateName}
                                onChange={(e) => update("candidateName", e.target.value)}
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="olFormGroup">
                            <label className="olFormLabel">Personal email</label>
                            <input
                                className="olFormInput"
                                type="email"
                                value={form.candidateEmail}
                                onChange={(e) => update("candidateEmail", e.target.value)}
                                placeholder="john.doe@gmail.com"
                            />
                        </div>
                    </div>

                    <div className="olFormSection glass">
                        <h2 className="olFormSectionTitle">
                            <Briefcase size={16} /> Internship details
                        </h2>
                        <div className="olFormRow">
                            <div className="olFormGroup">
                                <label className="olFormLabel">Department</label>
                                <input
                                    className="olFormInput"
                                    value={form.department}
                                    onChange={(e) => update("department", e.target.value)}
                                />
                            </div>
                            <div className="olFormGroup">
                                <label className="olFormLabel">Position / Title</label>
                                <input
                                    className="olFormInput"
                                    value={form.position}
                                    onChange={(e) => update("position", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="olFormGroup">
                            <label className="olFormLabel">Reporting Manager</label>
                            {directoryUserId ? (
                                <div style={{ marginBottom: "0.5rem" }}>
                                    <ReportingManagerSelect
                                        value={reportingManagerId}
                                        onChange={(newId) => {
                                            setReportingManagerId(newId);
                                            const u = directoryUsers.find((x) => x.id === newId);
                                            if (u) {
                                                update("reportingTo", reportingManagerDisplayName(u));
                                            } else {
                                                update("reportingTo", "");
                                            }
                                        }}
                                        excludeUserId={directoryUserId}
                                    />
                                    {form.reportingTo && (
                                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                            Will appear as: <strong>{form.reportingTo}</strong>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <input
                                    className="olFormInput"
                                    value={form.reportingTo}
                                    onChange={(e) => update("reportingTo", e.target.value)}
                                    placeholder="e.g. Jane Smith, Engineering Manager"
                                />
                            )}
                        </div>
                    </div>

                    <div className="olFormSection glass">
                        <h2 className="olFormSectionTitle">
                            <Calendar size={16} /> Dates
                        </h2>
                        <div className="olFormRow">
                            <div className="olFormGroup">
                                <label className="olFormLabel">Joining Date</label>
                                <input
                                    type="date"
                                    className="olFormInput"
                                    value={form.joiningDate}
                                    onChange={(e) => update("joiningDate", e.target.value)}
                                />
                            </div>
                            <div className="olFormGroup">
                                <label className="olFormLabel">Last Working Date</label>
                                <input
                                    type="date"
                                    className="olFormInput"
                                    value={form.lastWorkingDate}
                                    onChange={(e) => update("lastWorkingDate", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="olFormSection glass">
                        <h2 className="olFormSectionTitle" style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <PenLine size={16} /> Signatory
                            </span>
                            {savedHrSignatoryActive && (
                                <button
                                    type="button"
                                    onClick={clearSavedHrSignatory}
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-tertiary)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                    title="Clear saved defaults"
                                >
                                    Reset
                                </button>
                            )}
                        </h2>
                        <div className="olFormGroup">
                            <label className="olFormLabel">Signatory Name</label>
                            <input
                                className="olFormInput"
                                value={form.hrSignatory}
                                onChange={(e) => update("hrSignatory", e.target.value)}
                                placeholder="e.g. Jane Smith"
                            />
                        </div>
                        <div className="olFormGroup">
                            <label className="olFormLabel">Signatory Title</label>
                            <input
                                className="olFormInput"
                                value={form.hrSignatoryTitle}
                                onChange={(e) => update("hrSignatoryTitle", e.target.value)}
                                placeholder="e.g. Head of Human Resources"
                            />
                        </div>
                        <div className="olFormGroup">
                            <label className="olFormLabel">Digital Signature (Data URL)</label>
                            <input
                                className="olFormInput"
                                value={form.hrSignatureDataUrl}
                                onChange={(e) => update("hrSignatureDataUrl", e.target.value)}
                                placeholder="data:image/png;base64,..."
                            />
                            {form.hrSignatureDataUrl && (
                                <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "white", borderRadius: "4px", border: "1px solid var(--border)", display: "inline-block" }}>
                                    <img src={form.hrSignatureDataUrl} alt="Signature Preview" style={{ maxHeight: "40px" }} />
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                <main className="olMain">
                    <div className="olPreviewGlass glass">
                        {previewHtml ? (
                            <div className="olLivePreviewWrap">
                                {previewStale && (
                                    <div className="olStaleOverlay">
                                        <p>Updates pending.</p>
                                        <button className="olStaleBtn" onClick={preview} disabled={generating}>
                                            {generating ? <Loader2 size={16} className="animate-spin" /> : "Refresh preview"}
                                        </button>
                                    </div>
                                )}
                                <iframe srcDoc={previewHtml} className="olLivePreviewFrame" title="Finish Letter Preview" />
                            </div>
                        ) : (
                            <div className="olPreviewEmpty">
                                <FileSignature size={48} className="hubEmptyIcon" />
                                <p>Fill in the details and click Preview to see the generated finish letter here.</p>
                            </div>
                        )}

                        <div className="olActionRow">
                            <button className="hubBtnSecondary" onClick={preview} disabled={generating}>
                                {generating ? <Loader2 size={16} className="animate-spin" /> : <><Eye size={16} /> Preview Letter</>}
                            </button>

                            <button className="hubBtnPrimary" onClick={sendEmail} disabled={sendingEmail || !previewHtml || previewStale}>
                                {sendingEmail ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> Send Email</>}
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {previewOpen &&
                previewHtml &&
                createPortal(
                    <div className="olModalOverlay">
                        <div className="olModalContent glass" style={{ width: "90vw", maxWidth: "900px", height: "90vh" }}>
                            <div className="olModalHeader">
                                <h3 style={{ margin: 0 }}>Finish Letter Preview</h3>
                                <button className="olModalClose" onClick={() => setPreviewOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="olModalBody" style={{ padding: 0 }}>
                                <iframe srcDoc={previewHtml} style={{ width: "100%", height: "100%", border: "none" }} title="Preview" />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
