"use client";

import { useState, useEffect, useMemo } from "react";
import {
    FileUp,
    Clock,
    Loader2,
    ArrowLeft,
    Eye,
    Users,
    Pencil,
    Trash2,
    FileText,
    Shield,
    RefreshCw,
    Plus,
    X,
    Mail,
    Scale,
} from "lucide-react";
import Link from "next/link";
import "@/styles/people-hub.css";
import "./admin-documents.css";
import type { UserSummary, DocumentRecord } from "@/lib/api-types";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import EditDocumentModal from "@/components/EditDocumentModal";
import DeleteDocumentModal from "@/components/DeleteDocumentModal";

type SignerEntry = { email: string; role: string; userId: string };
type SignerField = keyof Pick<SignerEntry, "email" | "role" | "userId">;

function flowStatusClass(status: string): string {
    if (status === "PARTIALLY_SIGNED") return "admStatusBadge--partial";
    return "admStatusBadge--pending";
}

function formatStatus(status: string): string {
    return status.replace(/_/g, " ");
}

export default function AdminDocumentsPage() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [flows, setFlows] = useState<DocumentRecord[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [loadingFlows, setLoadingFlows] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
    const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
    const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [signers, setSigners] = useState<SignerEntry[]>([
        { email: "", role: "EMPLOYEE", userId: "" },
    ]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        url: "",
        type: "LEGAL",
    });
    const [useFileUpload, setUseFileUpload] = useState(true);

    useEffect(() => {
        fetchUsers();
        fetchFlows();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) setUsers(await res.json());
        } catch {
            console.error("Failed to fetch users");
        }
    };

    const fetchFlows = async () => {
        setLoadingFlows(true);
        try {
            const res = await fetch("/api/documents?flows=admin");
            if (res.ok) {
                const data: DocumentRecord[] = await res.json();
                setFlows(
                    data.filter(
                        (d) => d.status === "PENDING" || d.status === "PARTIALLY_SIGNED"
                    )
                );
            }
        } catch {
            console.error("Failed to fetch flows");
        } finally {
            setLoadingFlows(false);
        }
    };

    const pendingSignatures = useMemo(
        () =>
            flows.reduce(
                (sum, d) => sum + ((d.totalSigners ?? 0) - (d.signedCount ?? 0)),
                0
            ),
        [flows]
    );

    const legalCount = flows.filter((d) => d.type === "LEGAL").length;
    const policyCount = flows.filter((d) => d.type === "POLICY").length;

    const addSigner = () => {
        setSigners([...signers, { email: "", role: "EMPLOYEE", userId: "" }]);
    };

    const removeSigner = (index: number) => {
        setSigners(signers.filter((_, i) => i !== index));
    };

    const updateSigner = (index: number, field: SignerField, value: string) => {
        const newSigners = [...signers];
        if (field === "userId") {
            const user = users.find((u) => u.id === value);
            newSigners[index] = {
                ...newSigners[index],
                userId: value,
                email: user?.email || newSigners[index].email,
            };
        } else {
            newSigners[index] = { ...newSigners[index], [field]: value };
        }
        setSigners(newSigners);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            const validSigners = signers.filter((s) => s.email.trim());
            if (validSigners.length === 0) {
                alert("Add at least one signer with an email.");
                return;
            }

            let res: Response;

            if (useFileUpload) {
                if (!pdfFile) {
                    alert("Please select a PDF file.");
                    return;
                }
                const body = new FormData();
                body.append("file", pdfFile);
                body.append("title", formData.title);
                body.append("description", formData.description);
                body.append("type", formData.type);
                body.append("signers", JSON.stringify(validSigners));
                res = await fetch("/api/documents/upload", { method: "POST", body });
            } else {
                if (!formData.url.trim()) {
                    alert("Enter a document URL or upload a PDF.");
                    return;
                }
                res = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...formData,
                        signers: validSigners,
                        allowedRoles: "ALL",
                    }),
                });
            }

            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                const sent = (data as { emailsSent?: number }).emailsSent ?? 0;
                const failures =
                    (data as { emailFailures?: { email: string; message?: string }[] })
                        .emailFailures ?? [];
                const configured =
                    (data as { emailConfigured?: boolean }).emailConfigured ?? true;

                const created = data as DocumentRecord;
                if (created.id) {
                    setFlows((prev) => {
                        const exists = prev.some((d) => d.id === created.id);
                        const next = exists ? prev : [created, ...prev];
                        return next.filter(
                            (d) =>
                                d.status === "PENDING" || d.status === "PARTIALLY_SIGNED"
                        );
                    });
                }

                let msg = `Document "${formData.title || created.title}" issued successfully.`;
                if (sent > 0) {
                    msg += ` Email sent to ${sent} signer(s).`;
                } else if (!configured) {
                    msg +=
                        " Email was NOT sent — add ZOHO_USER and ZOHO_PASSWORD to .env and restart the server.";
                } else {
                    msg +=
                        " Email was NOT sent — check Zoho credentials. Signers can still open Documents & Legal in the portal.";
                    if (failures.length > 0) {
                        msg += ` Failed: ${failures.map((f) => f.email).join(", ")}`;
                    }
                }
                alert(msg);

                setFormData({ title: "", description: "", url: "", type: "LEGAL" });
                setSigners([{ email: "", role: "EMPLOYEE", userId: "" }]);
                setPdfFile(null);
                fetchFlows();
            } else {
                alert((data as { error?: string }).error || "Failed to issue document");
            }
        } catch {
            alert("Upload error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="hubPage admDocs">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <Link href="/documents" className="admBackLink" aria-label="Back to documents">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">Compliance</p>
                    <div className="admHeroTitleRow">
                        <h1>
                            Documents &amp; Legal <span className="text-gradient">Admin</span>
                        </h1>
                    </div>
                </div>
                <div className="hubHeroActions">
                    <span className="hubStatChip">
                        <FileText size={16} color="var(--nuriek-blue)" />
                        <strong>{flows.length}</strong> active flows
                    </span>
                    <Link href="/documents" className="hubBtnPrimary" style={{ textDecoration: "none" }}>
                        <Scale size={16} />
                        Documents &amp; Legal hub
                    </Link>
                </div>
            </header>

            <section className="hubKpiGrid" aria-label="Document summary">
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Active flows</span>
                    <span className="hubKpiValue hubKpiValue--default">{flows.length}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Awaiting signatures</span>
                    <span className="hubKpiValue hubKpiValue--orange">{pendingSignatures}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Legal / NDA</span>
                    <span className="hubKpiValue hubKpiValue--blue">{legalCount}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Policies</span>
                    <span className="hubKpiValue hubKpiValue--green">{policyCount}</span>
                </article>
            </section>

            <div className="admLayout">
                <form onSubmit={handleUpload} className="admPanel glass">
                    <h2 className="admPanelTitle">
                        <span className="admPanelTitleIcon">
                            <FileUp size={18} />
                        </span>
                        Issue document for signature
                    </h2>

                    <p className="admHint">
                        Signers receive an email link and must scroll to the end of the PDF in the
                        portal before they can sign.
                    </p>

                    <div className="admFormStack">
                        <div className="admField">
                            <label className="admLabel" htmlFor="doc-title">
                                Document title
                            </label>
                            <input
                                id="doc-title"
                                required
                                className="admInput"
                                placeholder="e.g. Remote Work Policy, NDA"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({ ...formData, title: e.target.value })
                                }
                            />
                        </div>

                        <div className="admField">
                            <label className="admLabel" htmlFor="doc-type">
                                Document type
                            </label>
                            <select
                                id="doc-type"
                                className="admSelect"
                                value={formData.type}
                                onChange={(e) =>
                                    setFormData({ ...formData, type: e.target.value })
                                }
                            >
                                <option value="LEGAL">Legal / NDA</option>
                                <option value="POLICY">Company policy</option>
                            </select>
                        </div>

                        <div className="admField">
                            <span className="admLabel">Document source</span>
                            <div className="admTabs" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={useFileUpload}
                                    className={`admTab ${useFileUpload ? "admTab--active" : ""}`}
                                    onClick={() => setUseFileUpload(true)}
                                >
                                    Upload PDF
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={!useFileUpload}
                                    className={`admTab ${!useFileUpload ? "admTab--active" : ""}`}
                                    onClick={() => setUseFileUpload(false)}
                                >
                                    External URL
                                </button>
                            </div>
                            {useFileUpload ? (
                                <input
                                    required
                                    type="file"
                                    accept="application/pdf"
                                    className="admInput"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                                />
                            ) : (
                                <input
                                    required
                                    className="admInput"
                                    placeholder="https://example.com/policy.pdf"
                                    value={formData.url}
                                    onChange={(e) =>
                                        setFormData({ ...formData, url: e.target.value })
                                    }
                                />
                            )}
                        </div>

                        <div className="admField">
                            <div className="admLabelRow">
                                <span className="admLabel" style={{ margin: 0 }}>
                                    <Mail size={12} style={{ display: "inline", marginRight: 4 }} />
                                    Required signers
                                </span>
                                <button type="button" className="admAddSigner" onClick={addSigner}>
                                    <Plus size={14} style={{ display: "inline", verticalAlign: -2 }} />{" "}
                                    Add signer
                                </button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {signers.map((signer, index) => (
                                    <div key={index} className="admSignerCard">
                                        <select
                                            className="admSelect"
                                            value={signer.userId}
                                            onChange={(e) =>
                                                updateSigner(index, "userId", e.target.value)
                                            }
                                        >
                                            <option value="">Select portal user (optional)</option>
                                            {users.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name} ({u.email})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="admSignerRow">
                                            <input
                                                required
                                                className="admInput"
                                                placeholder="Signer email"
                                                value={signer.email}
                                                onChange={(e) =>
                                                    updateSigner(index, "email", e.target.value)
                                                }
                                            />
                                            <select
                                                className="admSelect admRoleSelect"
                                                value={signer.role}
                                                onChange={(e) =>
                                                    updateSigner(index, "role", e.target.value)
                                                }
                                            >
                                                <option value="HR">HR</option>
                                                <option value="DIRECTOR">Director</option>
                                                <option value="EMPLOYEE">Employee</option>
                                                <option value="INTERN">Intern</option>
                                            </select>
                                            {signers.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="admSignerRemove"
                                                    onClick={() => removeSigner(index)}
                                                    aria-label="Remove signer"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="admField">
                            <label className="admLabel" htmlFor="doc-desc">
                                Instructions for signers
                            </label>
                            <textarea
                                id="doc-desc"
                                className="admTextarea"
                                placeholder="e.g. Please read the full NDA before signing…"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </div>

                        <button type="submit" disabled={isUploading} className="admSubmitBtn">
                            {isUploading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <FileUp size={18} />
                                    Send for signature
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <section className="admPanel glass">
                    <div className="admPanelHeader">
                        <h2 className="admPanelTitle" style={{ margin: 0 }}>
                            <span className="admPanelTitleIcon">
                                <Clock size={18} />
                            </span>
                            Active signature flows
                        </h2>
                        <button
                            type="button"
                            className="admRefreshBtn"
                            onClick={() => fetchFlows()}
                        >
                            <RefreshCw size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
                            Refresh
                        </button>
                    </div>

                    {loadingFlows ? (
                        <div className="admLoading">
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : flows.length === 0 ? (
                        <div className="admEmpty">
                            <Clock size={40} className="admEmptyIcon" />
                            <p>No pending signature flows.</p>
                            <p style={{ fontSize: "0.82rem", marginTop: "0.35rem" }}>
                                Issue a document using the form to start a new flow.
                            </p>
                        </div>
                    ) : (
                        <div className="admFlowsList">
                            {flows.map((doc) => {
                                const total = doc.totalSigners ?? 0;
                                const signed = doc.signedCount ?? 0;
                                const pct = total > 0 ? Math.round((signed / total) * 100) : 0;
                                const isLegal = doc.type === "LEGAL";

                                return (
                                    <article key={doc.id} className="admFlowCard">
                                        <div className="admFlowTop">
                                            <div className="admFlowMain">
                                                <div
                                                    className={`admFlowIcon ${isLegal ? "admFlowIcon--legal" : "admFlowIcon--policy"}`}
                                                >
                                                    {isLegal ? (
                                                        <Shield size={20} />
                                                    ) : (
                                                        <FileText size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="admFlowTitle">{doc.title}</div>
                                                    <div className="admFlowMeta">
                                                        <span>{doc.type}</span>
                                                        <span>·</span>
                                                        <span
                                                            className={`admStatusBadge ${flowStatusClass(doc.status)}`}
                                                        >
                                                            {formatStatus(doc.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="admFlowActions">
                                                <button
                                                    type="button"
                                                    className="admIconBtn"
                                                    onClick={() => setViewingDoc(doc)}
                                                >
                                                    <Eye size={14} />
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admIconBtn admIconBtn--iconOnly"
                                                    onClick={() => setEditingDoc(doc)}
                                                    aria-label="Edit document"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admIconBtn admIconBtn--iconOnly admIconBtn--danger"
                                                    onClick={() => setDeletingDoc(doc)}
                                                    aria-label="Delete document"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="admProgressBlock">
                                            <div className="admProgressHead">
                                                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                                    <Users size={12} />
                                                    Signatures
                                                </span>
                                                <strong>
                                                    {signed} / {total} ({pct}%)
                                                </strong>
                                            </div>
                                            <div className="admProgressTrack">
                                                <div
                                                    className="admProgressFill"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <EditDocumentModal
                document={editingDoc}
                isOpen={Boolean(editingDoc)}
                onClose={() => setEditingDoc(null)}
                onSaved={fetchFlows}
            />

            <DeleteDocumentModal
                isOpen={Boolean(deletingDoc)}
                onClose={() => setDeletingDoc(null)}
                onDelete={async () => {
                    if (!deletingDoc) return;
                    const res = await fetch(`/api/documents/${deletingDoc.id}`, {
                        method: "DELETE",
                    });
                    if (res.ok) {
                        setFlows((prev) => prev.filter((d) => d.id !== deletingDoc.id));
                        setDeletingDoc(null);
                    } else {
                        alert("Failed to delete");
                        throw new Error("delete failed");
                    }
                }}
                fileName={deletingDoc?.title ?? "document"}
            />

            {viewingDoc && (
                <DocumentViewerModal
                    document={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                    canSign={false}
                    isSigned={false}
                    hasRead={true}
                    onReadComplete={() => {}}
                    onSign={() => {}}
                />
            )}
        </div>
    );
}
