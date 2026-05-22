"use client";

import { useState, useEffect, useRef } from "react";
import {
    FileText,
    Shield,
    BookOpen,
    CheckCircle2,
    Eye,
    X,
    Loader2,
    PenTool,
    Eraser,
    Pencil,
    Trash2,
} from "lucide-react";
import "./documents.css";
import "@/styles/people-hub.css";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { DocumentRecord } from "@/lib/api-types";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import EditDocumentModal from "@/components/EditDocumentModal";
import DeleteDocumentModal from "@/components/DeleteDocumentModal";
import { isAdminRole, ROLES } from "@/lib/constants";
import { hasHrPermission } from "@/lib/hr-permissions";

type DocumentSigner = NonNullable<DocumentRecord["requiredSigners"]>[number] & { role?: string };
type CanvasPointerEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

export default function DocumentsPage() {
    const { data: session } = useSession();
    const currentUserRole = session?.user?.role;

    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
    const [signingDoc, setSigningDoc] = useState<DocumentRecord | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
    const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);

    const isAdmin = isAdminRole(currentUserRole);
    const canManageDocuments =
        currentUserRole === ROLES.FOUNDER ||
        hasHrPermission(
            currentUserRole,
            session?.user?.hrPermissions,
            "admin_documents"
        );

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                const data: DocumentRecord[] = await res.json();
                setDocuments(data.filter((d) => d.type !== "DRIVE"));
            }
        } catch {
            console.error("Failed to fetch documents");
        } finally {
            setIsLoading(false);
        }
    };

    const updateDocInState = (id: string, patch: Partial<DocumentRecord>) => {
        setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
        setViewingDoc((v) => (v?.id === id ? { ...v, ...patch } : v));
    };

    const canSignDoc = (doc: DocumentRecord) => {
        if (doc.isSigned) return false;
        if (doc.isRequiredSigner) return true;
        return doc.type === "POLICY" || doc.type === "LEGAL";
    };

    const getCanvasCoords = (e: CanvasPointerEvent, rect: DOMRect) => {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e: CanvasPointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const { x, y } = getCanvasCoords(e, rect);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: CanvasPointerEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const { x, y } = getCanvasCoords(e, rect);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const submitSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !signingDoc) return;

        setIsSigning(true);
        const signatureImage = canvas.toDataURL();

        try {
            const res = await fetch("/api/documents/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentId: signingDoc.id,
                    signature: signatureImage,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                fetchDocs();
                setSigningDoc(null);
                setViewingDoc(null);
                alert("Document signed successfully!");
            } else if ((data as { code?: string }).code === "READ_REQUIRED") {
                alert("Please read the entire document before signing.");
            } else {
                alert((data as { error?: string }).error || "Failed to sign document.");
            }
        } catch {
            alert("Error submitting signature.");
        } finally {
            setIsSigning(false);
        }
    };

    const openViewer = (doc: DocumentRecord) => setViewingDoc(doc);

    const handleDeleteDoc = async () => {
        if (!deletingDoc) return;
        const res = await fetch(`/api/documents/${deletingDoc.id}`, { method: "DELETE" });
        if (res.ok) {
            setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
            if (viewingDoc?.id === deletingDoc.id) setViewingDoc(null);
            setDeletingDoc(null);
        } else {
            const data = await res.json().catch(() => ({}));
            alert((data as { error?: string }).error || "Failed to delete document");
            throw new Error("delete failed");
        }
    };

    const openSignFromViewer = () => {
        if (!viewingDoc) return;
        if (!viewingDoc.hasRead) {
            alert("Please scroll through the entire document before signing.");
            return;
        }
        setSigningDoc(viewingDoc);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "POLICY":
                return BookOpen;
            case "LEGAL":
                return Shield;
            case "EMPLOYEE":
                return FileText;
            default:
                return FileText;
        }
    };

    const signatureRequests = documents.filter(
        (doc) => !doc.isSigned && (doc.status === "PENDING" || doc.status === "PARTIALLY_SIGNED")
    );
    const employeeDocuments = documents.filter(
        (doc) => doc.type === "EMPLOYEE" || Boolean(doc.targetUserId)
    );
    const generalPolicies = documents.filter(
        (doc) => (doc.type === "POLICY" || doc.type === "LEGAL") && !doc.targetUserId
    );

    const renderDocCard = (doc: DocumentRecord, accent?: "warning") => {
        const Icon = getIcon(doc.type);
        const needsSign = canSignDoc(doc);
        return (
            <div
                key={doc.id}
                className={`docCard glass${accent === "warning" ? " docCard--action" : ""}`}
            >
                <div className="docHeader">
                    <div className="docTitleSection">
                        <Icon
                            className={`docIcon${accent === "warning" ? " docIcon--warn" : ""}`}
                            size={22}
                        />
                        <div className="docMeta">
                            <span className="docTitle">{doc.title}</span>
                            <span
                                className={`docStatus ${
                                    doc.isSigned
                                        ? "docStatus--signed"
                                        : accent === "warning"
                                          ? "docStatus--pending"
                                          : "docStatus--neutral"
                                }`}
                            >
                                {doc.isSigned
                                    ? "Signed & verified"
                                    : accent === "warning"
                                      ? "Action required"
                                      : doc.type.replace(/_/g, " ")}
                            </span>
                        </div>
                    </div>
                </div>
                <p className="docDescription">
                    {doc.description || "Review and sign this company document."}
                </p>
                {accent === "warning" && doc.totalSigners ? (
                    <div className="docProgress">
                        <div className="docProgressMeta">
                            <span>Signature progress</span>
                            <span>
                                {doc.signedCount} / {doc.totalSigners} signed
                            </span>
                        </div>
                        <div className="docProgressBar">
                            <div
                                className="docProgressFill"
                                style={{
                                    width: `${((doc.signedCount ?? 0) / Math.max(doc.totalSigners ?? 1, 1)) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                ) : null}
                <div className="docFooter">
                    <span className="docDate">
                        Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" className="docAction" onClick={() => openViewer(doc)}>
                            <Eye size={14} />
                            <span>View</span>
                        </button>
                        {needsSign && !doc.hasRead && (
                            <span className="docReadHint">Read to sign</span>
                        )}
                        {doc.isSigned && (
                            <button type="button" className="docAction" disabled style={{ opacity: 0.6 }}>
                                <CheckCircle2 size={14} />
                                <span>Signed</span>
                            </button>
                        )}
                        {isAdmin && (
                            <>
                                <button
                                    type="button"
                                    className="docAction"
                                    title="Edit document"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingDoc(doc);
                                    }}
                                >
                                    <Pencil size={14} />
                                    <span>Edit</span>
                                </button>
                                <button
                                    type="button"
                                    className="docAction docAction--danger"
                                    title="Delete document"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingDoc(doc);
                                    }}
                                >
                                    <Trash2 size={14} />
                                    <span>Delete</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="hubPage docHubPage">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <p className="hubEyebrow">Compliance</p>
                    <h1>
                        Documents &amp; <span className="text-gradient">Legal</span>
                    </h1>
                    <p className="hubSubtitle">
                        Review policies, legal documents, and employment files — sign after reading
                        in full.
                    </p>
                </div>
                <div className="hubHeroActions">
                    {signatureRequests.length > 0 && (
                        <span className="hubStatChip">
                            <PenTool size={16} color="#ff9500" />
                            <strong>{signatureRequests.length}</strong> awaiting signature
                        </span>
                    )}
                    {canManageDocuments && (
                        <Link href="/admin/documents" className="hubBtnPrimary" style={{ textDecoration: "none" }}>
                            <Shield size={16} />
                            Manage documents
                        </Link>
                    )}
                </div>
            </header>

            {isLoading ? (
                <div className="docHubLoading">
                    <Loader2 className="animate-spin" size={40} color="var(--nuriek-blue)" />
                </div>
            ) : (
                <>
                    {signatureRequests.length > 0 && (
                        <section className="docHubSection glass">
                            <h2 className="docHubSectionHead docHubSectionHead--warn">
                                <PenTool size={18} />
                                Signature requests
                            </h2>
                            <div className="docGrid">
                                {signatureRequests.map((doc) => renderDocCard(doc, "warning"))}
                            </div>
                        </section>
                    )}

                    {employeeDocuments.length > 0 && (
                        <section className="docHubSection glass">
                            <h2 className="docHubSectionHead">
                                <FileText size={18} />
                                My employment documents
                            </h2>
                            <div className="docGrid">
                                {employeeDocuments.map((doc) => renderDocCard(doc))}
                            </div>
                        </section>
                    )}

                    <section className="docHubSection glass">
                        <h2 className="docHubSectionHead">
                            <BookOpen size={18} />
                            Company policies &amp; legal
                        </h2>
                        <div className="docGrid">
                            {generalPolicies.length > 0 ? (
                                generalPolicies.map((doc) => renderDocCard(doc))
                            ) : (
                                <p className="docHubEmpty">No policy documents yet.</p>
                            )}
                        </div>
                    </section>
                </>
            )}

            <EditDocumentModal
                document={editingDoc}
                isOpen={Boolean(editingDoc)}
                onClose={() => setEditingDoc(null)}
                onSaved={fetchDocs}
            />

            <DeleteDocumentModal
                isOpen={Boolean(deletingDoc)}
                onClose={() => setDeletingDoc(null)}
                onDelete={handleDeleteDoc}
                fileName={deletingDoc?.title ?? "this document"}
            />

            {viewingDoc && (
                <DocumentViewerModal
                    document={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                    canSign={canSignDoc(viewingDoc)}
                    isSigned={Boolean(viewingDoc.isSigned)}
                    hasRead={Boolean(viewingDoc.hasRead)}
                    onReadComplete={() => updateDocInState(viewingDoc.id, { hasRead: true })}
                    onSign={openSignFromViewer}
                />
            )}

            {signingDoc && (
                <div className="docSignOverlay">
                    <div className="docSignModal">
                        <div className="docSignModalHead">
                            <div>
                                <h2>Sign document</h2>
                                <p>{signingDoc.title}</p>
                            </div>
                            <button
                                type="button"
                                className="docSignClose"
                                onClick={() => setSigningDoc(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="docSignCanvasWrap">
                            <canvas
                                ref={canvasRef}
                                width={436}
                                height={196}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            <div className="docSignCanvasHint">Draw your signature above</div>
                        </div>

                        <div className="docSignModalFoot">
                            <button type="button" className="docSignClear" onClick={clearSignature}>
                                <Eraser size={16} />
                                <span>Clear</span>
                            </button>
                            <button
                                type="button"
                                className="docSignConfirm"
                                onClick={submitSignature}
                                disabled={isSigning}
                            >
                                {isSigning ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirm &amp; sign</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
