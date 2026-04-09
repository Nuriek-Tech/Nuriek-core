"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    BadgeCheck,
    FileText,
    Award,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Plus,
    Shield,
    Download,
    ChevronDown,
    AlertTriangle,
    Eye,
    RefreshCw,
    Users
} from "lucide-react";
import "./certificates.css";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    PENDING: { color: "#ff9f0a", bg: "rgba(255,159,10,0.12)", icon: Clock, label: "Pending Approval" },
    APPROVED: { color: "#34c759", bg: "rgba(52,199,89,0.12)", icon: CheckCircle2, label: "Approved" },
    REJECTED: { color: "#ff3b30", bg: "rgba(255,59,48,0.12)", icon: XCircle, label: "Rejected" },
};

const CERT_TYPES = {
    EXPERIENCE: {
        label: "Experience Certificate",
        description: "Official certificate confirming your employment period and contributions at Nuriek.",
        icon: Award,
        color: "#bf5af2"
    },
    BONAFIDE: {
        label: "Bonafide Letter",
        description: "Official letter certifying your current employment status, useful for banks, visa applications, etc.",
        icon: FileText,
        color: "var(--nuriek-blue)"
    }
};

interface CertRequest {
    id: string;
    userId: string;
    type: "EXPERIENCE" | "BONAFIDE";
    status: "PENDING" | "APPROVED" | "REJECTED";
    purpose?: string;
    requestedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionNote?: string;
    user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        profile?: { department?: string; position?: string; joinDate?: string };
    };
}

export default function CertificatesPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const isAdmin = ["FOUNDER", "HR_ADMIN"].includes(userRole);

    const [requests, setRequests] = useState<CertRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"my" | "admin">(isAdmin ? "admin" : "my");

    // Request form
    const [selectedType, setSelectedType] = useState<"EXPERIENCE" | "BONAFIDE" | null>(null);
    const [purpose, setPurpose] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    // Admin action states
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
    const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user) {
            setActiveTab(isAdmin ? "admin" : "my");
            fetchRequests();
        }
    }, [session]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/certificate-requests");
            if (res.ok) {
                setRequests(await res.json());
            }
        } catch { /* silent */ }
        finally { setIsLoading(false); }
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) { setFormError("Please select a certificate type."); return; }
        setIsSubmitting(true);
        setFormError("");
        setFormSuccess("");
        try {
            const res = await fetch("/api/certificate-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: selectedType, purpose })
            });
            if (res.ok) {
                setFormSuccess(`${CERT_TYPES[selectedType].label} request submitted! HR will review it shortly.`);
                setSelectedType(null);
                setPurpose("");
                setShowForm(false);
                fetchRequests();
            } else {
                const msg = await res.text();
                setFormError(msg || "Failed to submit request.");
            }
        } catch {
            setFormError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminAction = async (requestId: string, action: "approve" | "reject") => {
        setProcessingId(requestId);
        try {
            const res = await fetch(`/api/certificate-requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    rejectionNote: action === "reject" ? (rejectionNotes[requestId] || "") : undefined
                })
            });
            if (res.ok) {
                setShowRejectInput(null);
                fetchRequests();
            } else {
                alert("Action failed. Please try again.");
            }
        } catch {
            alert("Network error.");
        } finally {
            setProcessingId(null);
        }
    };

    const myRequests = requests.filter((r) => r.userId === (session?.user as any)?.id);
    const pendingAdminRequests = requests.filter((r) => r.status === "PENDING");
    const allAdminRequests = requests;

    return (
        <div className="certContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1><span className="text-gradient">My Certificates</span></h1>
                    <p>Request official HR certificates for employment proof, visa, banking, and more</p>
                </div>
                {!showForm && (
                    <button
                        className="checkInButton"
                        onClick={() => { setShowForm(true); setFormError(""); setFormSuccess(""); }}
                    >
                        <Plus size={18} />
                        <span>Request Certificate</span>
                    </button>
                )}
            </header>

            {/* Success Banner */}
            {formSuccess && (
                <div className="certBanner certBannerSuccess">
                    <CheckCircle2 size={20} />
                    <span>{formSuccess}</span>
                    <button onClick={() => setFormSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", marginLeft: "auto" }}>✕</button>
                </div>
            )}

            {/* Request Form */}
            {showForm && (
                <section className="card glass certFormCard">
                    <div className="cardHeader">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-md)", background: "rgba(191,90,242,0.12)", color: "#bf5af2" }}>
                                <Plus size={20} />
                            </div>
                            <span className="cardTitle">New Certificate Request</span>
                        </div>
                        <button
                            onClick={() => { setShowForm(false); setFormError(""); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: "0.25rem" }}
                        >
                            <XCircle size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmitRequest} style={{ marginTop: "1.5rem" }}>
                        {/* Type selector */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                            {(Object.entries(CERT_TYPES) as [string, typeof CERT_TYPES["EXPERIENCE"]][]).map(([key, cert]) => {
                                const Icon = cert.icon;
                                const isSelected = selectedType === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelectedType(key as any)}
                                        className={`certTypeCard ${isSelected ? "certTypeCardActive" : ""}`}
                                        style={isSelected ? { borderColor: cert.color, background: `rgba(${cert.color === "#bf5af2" ? "191,90,242" : "10,132,255"},0.08)` } : {}}
                                    >
                                        <div className="certTypeIcon" style={{ background: `rgba(${cert.color === "#bf5af2" ? "191,90,242" : "10,132,255"},0.12)`, color: cert.color }}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="certTypeLabel">{cert.label}</div>
                                        <div className="certTypeDesc">{cert.description}</div>
                                        {isSelected && <div className="certTypeCheck"><CheckCircle2 size={16} color={cert.color} /></div>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Purpose field */}
                        <div className="inputGroup">
                            <label className="statLabel">Purpose / Reason <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(optional)</span></label>
                            <div className="inputWrapper" style={{ alignItems: "flex-start", padding: "0.75rem" }}>
                                <FileText className="inputIcon" size={18} style={{ marginTop: "0.1rem" }} />
                                <textarea
                                    className="input"
                                    placeholder="e.g. For bank loan application, visa filing, higher education..."
                                    rows={3}
                                    value={purpose}
                                    onChange={e => setPurpose(e.target.value)}
                                    style={{ background: "transparent", border: "none", resize: "none", width: "100%", outline: "none" }}
                                />
                            </div>
                        </div>

                        {formError && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ff3b30", fontSize: "0.85rem", marginTop: "0.75rem", background: "rgba(255,59,48,0.1)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                                <AlertTriangle size={16} />{formError}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedType}
                                className="checkInButton"
                                style={{ flex: 1, height: "3rem", opacity: !selectedType ? 0.5 : 1 }}
                            >
                                {isSubmitting
                                    ? <Loader2 size={18} className="animate-spin" />
                                    : <><BadgeCheck size={18} /><span>Submit Request</span></>
                                }
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setFormError(""); }}
                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "var(--radius-lg)", padding: "0 1.5rem", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.875rem" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Tab Bar for Admins */}
            {isAdmin && (
                <div style={{ display: "flex", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.4rem", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.5rem", width: "fit-content" }}>
                    <button
                        onClick={() => setActiveTab("my")}
                        className={`checkInButton ${activeTab !== "my" ? "ghost" : ""}`}
                        style={activeTab !== "my" ? { background: "transparent", boxShadow: "none", color: "rgba(255,255,255,0.5)" } : {}}
                    >
                        <BadgeCheck size={16} /><span>My Requests</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("admin")}
                        className={`checkInButton ${activeTab !== "admin" ? "ghost" : ""}`}
                        style={activeTab !== "admin" ? { background: "transparent", boxShadow: "none", color: "rgba(255,255,255,0.5)" } : {}}
                    >
                        <Shield size={16} />
                        <span>Admin Panel</span>
                        {pendingAdminRequests.length > 0 && (
                            <span style={{ background: "#ff3b30", borderRadius: "9999px", fontSize: "0.7rem", padding: "1px 7px", fontWeight: 700 }}>
                                {pendingAdminRequests.length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* MY REQUESTS TAB */}
            {activeTab === "my" && (
                <section className="card glass">
                    <div className="cardHeader">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-md)", background: "rgba(191,90,242,0.12)", color: "#bf5af2" }}>
                                <BadgeCheck size={20} />
                            </div>
                            <span className="cardTitle">My Certificate Requests</span>
                        </div>
                        <button onClick={fetchRequests} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: "0.25rem", display: "flex" }}>
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: "3rem", textAlign: "center" }}>
                            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto" }} />
                        </div>
                    ) : myRequests.length === 0 ? (
                        <div className="certEmptyState">
                            <BadgeCheck size={48} style={{ opacity: 0.12, margin: "0 auto 1rem" }} />
                            <p>No certificate requests yet.</p>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>Click "Request Certificate" above to get started.</p>
                        </div>
                    ) : (
                        <div className="certRequestList">
                            {myRequests.map((req) => {
                                const statusCfg = STATUS_CONFIG[req.status];
                                const StatusIcon = statusCfg.icon;
                                const certInfo = CERT_TYPES[req.type];
                                const CertIcon = certInfo.icon;

                                return (
                                    <div key={req.id} className="certRequestItem">
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                            <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: `rgba(${certInfo.color === "#bf5af2" ? "191,90,242" : "10,132,255"},0.1)`, color: certInfo.color }}>
                                                <CertIcon size={20} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{certInfo.label}</span>
                                                    <span className="certStatusBadge" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                                                        <StatusIcon size={12} />
                                                        {statusCfg.label}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
                                                    Requested {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                    {req.purpose && ` · Purpose: ${req.purpose}`}
                                                </div>
                                                {req.status === "APPROVED" && req.approvedBy && (
                                                    <div style={{ fontSize: "0.78rem", color: "#34c759", marginTop: "0.2rem" }}>
                                                        ✓ Approved by {req.approvedBy} on {new Date(req.approvedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                    </div>
                                                )}
                                                {req.status === "REJECTED" && req.rejectionNote && (
                                                    <div style={{ fontSize: "0.78rem", color: "#ff3b30", marginTop: "0.2rem" }}>
                                                        Reason: {req.rejectionNote}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {req.status === "APPROVED" && (
                                            <a
                                                href={`/api/certificate-requests/${req.id}/generate`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="certDownloadBtn"
                                            >
                                                <Download size={16} />
                                                <span>Download</span>
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* ADMIN PANEL TAB */}
            {activeTab === "admin" && isAdmin && (
                <section className="card glass">
                    <div className="cardHeader">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", borderRadius: "var(--radius-md)", background: "rgba(10,132,255,0.12)", color: "var(--nuriek-blue)" }}>
                                <Shield size={20} />
                            </div>
                            <span className="cardTitle">All Certificate Requests</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                                <Users size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.3rem" }} />
                                {allAdminRequests.length} total · {pendingAdminRequests.length} pending
                            </span>
                            <button onClick={fetchRequests} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: "0.25rem", display: "flex" }}>
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: "3rem", textAlign: "center" }}>
                            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto" }} />
                        </div>
                    ) : allAdminRequests.length === 0 ? (
                        <div className="certEmptyState">
                            <Shield size={48} style={{ opacity: 0.12, margin: "0 auto 1rem" }} />
                            <p>No certificate requests have been submitted yet.</p>
                        </div>
                    ) : (
                        <div className="certRequestList">
                            {/* Pending first */}
                            {allAdminRequests.sort((a, b) => {
                                if (a.status === "PENDING" && b.status !== "PENDING") return -1;
                                if (b.status === "PENDING" && a.status !== "PENDING") return 1;
                                return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
                            }).map((req) => {
                                const statusCfg = STATUS_CONFIG[req.status];
                                const StatusIcon = statusCfg.icon;
                                const certInfo = CERT_TYPES[req.type];
                                const CertIcon = certInfo.icon;
                                const isProcessing = processingId === req.id;

                                return (
                                    <div key={req.id} className={`certRequestItem certAdminItem ${req.status === "PENDING" ? "certAdminPending" : ""}`}>
                                        <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: 0 }}>
                                            {/* User Avatar */}
                                            <div className="certAdminAvatar">
                                                {req.user?.name?.charAt(0) || "?"}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{req.user?.name || "Unknown"}</span>
                                                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                                        {req.user?.role?.replace(/_/g, " ")}
                                                        {req.user?.profile?.department && ` · ${req.user.profile.department}`}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                                                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", color: certInfo.color }}>
                                                        <CertIcon size={14} />{certInfo.label}
                                                    </span>
                                                    <span className="certStatusBadge" style={{ color: statusCfg.color, background: statusCfg.bg, fontSize: "0.73rem" }}>
                                                        <StatusIcon size={11} />{statusCfg.label}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
                                                    {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                    {req.purpose && ` · "${req.purpose}"`}
                                                </div>
                                                {req.status === "REJECTED" && req.rejectionNote && (
                                                    <div style={{ fontSize: "0.77rem", color: "#ff3b30", marginTop: "0.2rem" }}>Note: {req.rejectionNote}</div>
                                                )}
                                                {/* Reject note input */}
                                                {showRejectInput === req.id && (
                                                    <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Reason for rejection (optional)"
                                                            value={rejectionNotes[req.id] || ""}
                                                            onChange={e => setRejectionNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                            style={{ flex: 1, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: "var(--radius-md)", padding: "0.45rem 0.75rem", color: "white", fontSize: "0.82rem" }}
                                                        />
                                                        <button
                                                            onClick={() => handleAdminAction(req.id, "reject")}
                                                            disabled={isProcessing}
                                                            style={{ background: "#ff3b30", border: "none", borderRadius: "var(--radius-md)", padding: "0.45rem 1rem", cursor: "pointer", color: "white", fontSize: "0.82rem", fontWeight: 600 }}
                                                        >
                                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : "Confirm Reject"}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRejectInput(null)}
                                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Admin Action Buttons */}
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexShrink: 0 }}>
                                            {req.status === "APPROVED" && (
                                                <a
                                                    href={`/api/certificate-requests/${req.id}/generate`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="certDownloadBtn"
                                                    style={{ fontSize: "0.78rem" }}
                                                >
                                                    <Eye size={14} /><span>Preview</span>
                                                </a>
                                            )}
                                            {req.status === "PENDING" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAdminAction(req.id, "approve")}
                                                        disabled={isProcessing}
                                                        className="certApproveBtn"
                                                    >
                                                        {isProcessing
                                                            ? <Loader2 size={14} className="animate-spin" />
                                                            : <><CheckCircle2 size={14} /><span>Approve</span></>
                                                        }
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRejectInput(req.id)}
                                                        disabled={isProcessing}
                                                        className="certRejectBtn"
                                                    >
                                                        <XCircle size={14} /><span>Reject</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
