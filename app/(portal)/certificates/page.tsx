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
    AlertTriangle,
    Eye,
    RefreshCw,
    Users,
} from "lucide-react";
import { formatRoleLabel } from "@/lib/roles";
import "@/styles/people-hub.css";
import "../admin/documents/admin-documents.css";
import "./certificates.css";
import type { CertificateRequest } from "@/lib/api-types";
import type { LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<
    string,
    { color: string; bg: string; icon: LucideIcon; label: string }
> = {
    PENDING: {
        color: "#ff9f0a",
        bg: "rgba(255,159,10,0.12)",
        icon: Clock,
        label: "Pending",
    },
    APPROVED: {
        color: "#34c759",
        bg: "rgba(52,199,89,0.12)",
        icon: CheckCircle2,
        label: "Approved",
    },
    REJECTED: {
        color: "#ff3b30",
        bg: "rgba(255,59,48,0.12)",
        icon: XCircle,
        label: "Rejected",
    },
};

const CERT_TYPES = {
    EXPERIENCE: {
        label: "Experience Certificate",
        description: "Confirms employment period and contributions at Nuriek.",
        icon: Award,
        mod: "experience" as const,
    },
    BONAFIDE: {
        label: "Bonafide Letter",
        description: "Certifies current employment for banks, visa, or education.",
        icon: FileText,
        mod: "bonafide" as const,
    },
};

interface CertRequest extends CertificateRequest {
    userId: string;
    type: "EXPERIENCE" | "BONAFIDE";
    status: "PENDING" | "APPROVED" | "REJECTED";
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
    const userRole = session?.user?.role;
    const isAdmin = userRole === "FOUNDER" || userRole === "HR_ADMIN";

    const [requests, setRequests] = useState<CertRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"my" | "admin">(isAdmin ? "admin" : "my");

    const [selectedType, setSelectedType] = useState<"EXPERIENCE" | "BONAFIDE" | null>(null);
    const [purpose, setPurpose] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
    const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user) {
            setActiveTab(isAdmin ? "admin" : "my");
            fetchRequests();
        }
    }, [session, isAdmin]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/certificate-requests");
            if (res.ok) setRequests(await res.json());
        } catch {
            /* silent */
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) {
            setFormError("Please select a certificate type.");
            return;
        }
        setIsSubmitting(true);
        setFormError("");
        setFormSuccess("");
        try {
            const res = await fetch("/api/certificate-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: selectedType, purpose }),
            });
            if (res.ok) {
                setFormSuccess(
                    `${CERT_TYPES[selectedType].label} request submitted. HR will review shortly.`
                );
                setSelectedType(null);
                setPurpose("");
                setShowForm(false);
                fetchRequests();
            } else {
                setFormError((await res.text()) || "Failed to submit request.");
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
                    rejectionNote:
                        action === "reject" ? rejectionNotes[requestId] || "" : undefined,
                }),
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

    const myRequests = requests.filter((r) => r.userId === session?.user?.id);
    const pendingAdminRequests = requests.filter((r) => r.status === "PENDING");
    const sortedAdmin = [...requests].sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (b.status === "PENDING" && a.status !== "PENDING") return 1;
        return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    const renderMyItem = (req: CertRequest) => {
        const statusCfg = STATUS_CONFIG[req.status];
        const StatusIcon = statusCfg.icon;
        const certInfo = CERT_TYPES[req.type];
        const CertIcon = certInfo.icon;
        const iconMod = certInfo.mod;

        return (
            <div key={req.id} className="certRequestItem">
                <div className="certRequestMain">
                    <div className={`certTypeIconSm certTypeIcon--${iconMod}`}>
                        <CertIcon size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600 }}>{certInfo.label}</span>
                            <span
                                className="certStatusBadge"
                                style={{ color: statusCfg.color, background: statusCfg.bg }}
                            >
                                <StatusIcon size={12} />
                                {statusCfg.label}
                            </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            {new Date(req.requestedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}
                            {req.purpose ? ` · ${req.purpose}` : ""}
                        </div>
                        {req.status === "APPROVED" && req.approvedBy && (
                            <div style={{ fontSize: "0.78rem", color: "#34c759", marginTop: "0.2rem" }}>
                                Approved by {req.approvedBy}
                            </div>
                        )}
                        {req.status === "REJECTED" && req.rejectionNote && (
                            <div style={{ fontSize: "0.78rem", color: "#ff3b30", marginTop: "0.2rem" }}>
                                {req.rejectionNote}
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
                        Download
                    </a>
                )}
            </div>
        );
    };

    const renderAdminItem = (req: CertRequest) => {
        const statusCfg = STATUS_CONFIG[req.status];
        const StatusIcon = statusCfg.icon;
        const certInfo = CERT_TYPES[req.type];
        const CertIcon = certInfo.icon;
        const isProcessing = processingId === req.id;

        return (
            <div
                key={req.id}
                className={`certRequestItem certAdminItem ${req.status === "PENDING" ? "certAdminPending" : ""}`}
            >
                <div className="certRequestMain">
                    <div className="certAdminAvatar">{req.user?.name?.charAt(0) || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600 }}>{req.user?.name || "Unknown"}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                {formatRoleLabel(req.user?.role)}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.85rem", color: certInfo.mod === "experience" ? "#bf5af2" : "var(--nuriek-blue)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <CertIcon size={14} />
                                {certInfo.label}
                            </span>
                            <span className="certStatusBadge" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                                <StatusIcon size={11} />
                                {statusCfg.label}
                            </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
                            {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            {req.purpose ? ` · "${req.purpose}"` : ""}
                        </div>
                        {showRejectInput === req.id && (
                            <div className="certRejectInputRow">
                                <input
                                    type="text"
                                    className="certRejectInput"
                                    placeholder="Rejection reason (optional)"
                                    value={rejectionNotes[req.id] || ""}
                                    onChange={(e) =>
                                        setRejectionNotes((p) => ({ ...p, [req.id]: e.target.value }))
                                    }
                                />
                                <button
                                    type="button"
                                    className="certRejectConfirm"
                                    onClick={() => handleAdminAction(req.id, "reject")}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
                                </button>
                                <button type="button" className="certRejectCancel" onClick={() => setShowRejectInput(null)}>
                                    <XCircle size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="certAdminActions">
                    {req.status === "APPROVED" && (
                        <a
                            href={`/api/certificate-requests/${req.id}/generate`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="certDownloadBtn"
                        >
                            <Eye size={14} />
                            Preview
                        </a>
                    )}
                    {req.status === "PENDING" && (
                        <>
                            <button
                                type="button"
                                className="certApproveBtn"
                                onClick={() => handleAdminAction(req.id, "approve")}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 size={14} />
                                        Approve
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="certRejectBtn"
                                onClick={() => setShowRejectInput(req.id)}
                                disabled={isProcessing}
                            >
                                <XCircle size={14} />
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="hubPage certHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <p className="hubEyebrow">HR documents</p>
                    <h1>
                        <span className="text-gradient">Certificates</span>
                    </h1>
                    <p className="hubSubtitle">
                        Request experience letters and bonafide certificates for banking, visa, and employment proof.
                    </p>
                </div>
                <div className="hubHeroActions">
                    {isAdmin && pendingAdminRequests.length > 0 && (
                        <span className="hubStatChip">
                            <Clock size={16} color="#ff9f0a" />
                            <strong>{pendingAdminRequests.length}</strong> pending
                        </span>
                    )}
                    <span className="hubStatChip">
                        <BadgeCheck size={16} color="var(--nuriek-blue)" />
                        <strong>{myRequests.length}</strong> my requests
                    </span>
                    {!showForm && (
                        <button
                            type="button"
                            className="hubBtnPrimary"
                            onClick={() => {
                                setShowForm(true);
                                setFormError("");
                                setFormSuccess("");
                            }}
                        >
                            <Plus size={18} />
                            Request certificate
                        </button>
                    )}
                </div>
            </header>

            {formSuccess && (
                <div className="certBanner certBannerSuccess">
                    <CheckCircle2 size={20} />
                    <span>{formSuccess}</span>
                    <button type="button" className="certBannerClose" onClick={() => setFormSuccess("")} aria-label="Dismiss">
                        ✕
                    </button>
                </div>
            )}

            {showForm && (
                <section className="admPanel glass certFormPanel">
                    <div className="admPanelHeader">
                        <h2 className="admPanelTitle" style={{ margin: 0 }}>
                            <span className="admPanelTitleIcon">
                                <Plus size={18} />
                            </span>
                            New certificate request
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setFormError("");
                            }}
                            className="certRefreshBtn"
                            aria-label="Close form"
                        >
                            <XCircle size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmitRequest}>
                        <div className="certTypeGrid">
                            {(Object.entries(CERT_TYPES) as [keyof typeof CERT_TYPES, (typeof CERT_TYPES)["EXPERIENCE"]][]).map(
                                ([key, cert]) => {
                                    const Icon = cert.icon;
                                    const isSelected = selectedType === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedType(key)}
                                            className={`certTypeCard certTypeCard--${cert.mod} ${isSelected ? "certTypeCardActive" : ""}`}
                                        >
                                            <div className={`certTypeIcon certTypeIcon--${cert.mod}`}>
                                                <Icon size={22} />
                                            </div>
                                            <div className="certTypeLabel">{cert.label}</div>
                                            <div className="certTypeDesc">{cert.description}</div>
                                            {isSelected && (
                                                <div className="certTypeCheck">
                                                    <CheckCircle2 size={16} color={cert.mod === "experience" ? "#bf5af2" : "var(--nuriek-blue)"} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                }
                            )}
                        </div>

                        <div className="admField">
                            <label className="admLabel" htmlFor="cert-purpose">
                                Purpose (optional)
                            </label>
                            <textarea
                                id="cert-purpose"
                                className="admTextarea"
                                placeholder="e.g. bank loan, visa, higher education…"
                                rows={3}
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                            />
                        </div>

                        {formError && (
                            <p className="certFormError">
                                <AlertTriangle size={16} />
                                {formError}
                            </p>
                        )}

                        <div className="certFormActions">
                            <button type="submit" className="admSubmitBtn" disabled={isSubmitting || !selectedType} style={{ flex: 1 }}>
                                {isSubmitting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <BadgeCheck size={18} />
                                        Submit request
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="certCancelBtn"
                                onClick={() => {
                                    setShowForm(false);
                                    setFormError("");
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {isAdmin && (
                <div className="hubFilters" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        className={`hubFilterPill ${activeTab === "my" ? "hubFilterPill--active" : ""}`}
                        onClick={() => setActiveTab("my")}
                    >
                        My requests
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`hubFilterPill ${activeTab === "admin" ? "hubFilterPill--active" : ""}`}
                        onClick={() => setActiveTab("admin")}
                    >
                        <Shield size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
                        Admin panel
                        {pendingAdminRequests.length > 0 && (
                            <span style={{ marginLeft: 6, background: "#ff3b30", color: "#fff", borderRadius: 999, fontSize: "0.65rem", padding: "1px 6px" }}>
                                {pendingAdminRequests.length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {activeTab === "my" && (
                <section className="certListPanel glass">
                    <div className="certListHeader">
                        <span className="certListTitle">
                            <span className="certListTitleIcon certListTitleIcon--purple">
                                <BadgeCheck size={18} />
                            </span>
                            My certificate requests
                        </span>
                        <button type="button" className="certRefreshBtn" onClick={fetchRequests} aria-label="Refresh">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {isLoading ? (
                        <div className="repLoading">
                            <Loader2 size={28} className="animate-spin" />
                        </div>
                    ) : myRequests.length === 0 ? (
                        <div className="certEmptyState">
                            <BadgeCheck size={48} className="certEmptyIcon" />
                            <p>No requests yet.</p>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", marginTop: "0.35rem" }}>
                                Click Request certificate to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="certRequestList">{myRequests.map(renderMyItem)}</div>
                    )}
                </section>
            )}

            {activeTab === "admin" && isAdmin && (
                <section className="certListPanel glass">
                    <div className="certListHeader">
                        <span className="certListTitle">
                            <span className="certListTitleIcon certListTitleIcon--blue">
                                <Shield size={18} />
                            </span>
                            All requests
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                                <Users size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                                {requests.length} total
                            </span>
                            <button type="button" className="certRefreshBtn" onClick={fetchRequests} aria-label="Refresh">
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="repLoading">
                            <Loader2 size={28} className="animate-spin" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="certEmptyState">
                            <Shield size={48} className="certEmptyIcon" />
                            <p>No certificate requests submitted yet.</p>
                        </div>
                    ) : (
                        <div className="certRequestList">{sortedAdmin.map(renderAdminItem)}</div>
                    )}
                </section>
            )}
        </div>
    );
}
