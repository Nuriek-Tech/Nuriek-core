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
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { DocumentRecord } from "@/lib/api-types";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import EditDocumentModal from "@/components/EditDocumentModal";
import DeleteDocumentModal from "@/components/DeleteDocumentModal";
import { isAdminRole } from "@/lib/constants";

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
                className="docCard glass"
                style={accent === "warning" ? { borderColor: "rgba(255, 149, 0, 0.3)" } : undefined}
            >
                <div className="docHeader">
                    <div className="docTitleSection">
                        <Icon className="docIcon" size={24} color={accent === "warning" ? "#ff9500" : undefined} />
                        <div className="docMeta">
                            <span className="docTitle">{doc.title}</span>
                            <span
                                className={`docStatus ${doc.isSigned ? "statusOnTime" : "statusPending"}`}
                                style={{ textTransform: "uppercase", fontSize: "0.65rem" }}
                            >
                                {doc.isSigned
                                    ? "SIGNED & VERIFIED"
                                    : accent === "warning"
                                      ? "ACTION REQUIRED"
                                      : doc.type}
                            </span>
                        </div>
                    </div>
                </div>
                <p className="docDescription">{doc.description || "Review and sign this company document."}</p>
                {accent === "warning" && doc.totalSigners ? (
                    <div style={{ marginBottom: "1rem" }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.4rem",
                                fontSize: "0.75rem",
                            }}
                        >
                            <span style={{ color: "#ff9500" }}>Signature Progress</span>
                            <span>
                                {doc.signedCount} / {doc.totalSigners} signed
                            </span>
                        </div>
                        <div
                            style={{
                                height: "4px",
                                background: "rgba(255, 149, 0, 0.1)",
                                borderRadius: "2px",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    width: `${((doc.signedCount ?? 0) / Math.max(doc.totalSigners ?? 1, 1)) * 100}%`,
                                    height: "100%",
                                    background: "#ff9500",
                                }}
                            />
                        </div>
                    </div>
                ) : null}
                <div className="docFooter">
                    <span className="docDate">Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="docAction" onClick={() => openViewer(doc)}>
                            <Eye size={14} />
                            <span>View</span>
                        </button>
                        {needsSign && !doc.hasRead && (
                            <span style={{ fontSize: "0.7rem", color: "#fbbf24", alignSelf: "center" }}>
                                Read to sign
                            </span>
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
                                    className="docAction"
                                    title="Delete document"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingDoc(doc);
                                    }}
                                    style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }}
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
        <div className="docContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Documents & Policy Hub</h1>
                    <p>Review policies, NDAs, and company documents — sign after reading in full</p>
                </div>
                {isAdmin && (
                    <Link href="/admin/documents" className="checkInButton" style={{ textDecoration: "none" }}>
                        <Shield size={18} />
                        <span>Admin Document Portal</span>
                    </Link>
                )}
            </header>

            {isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
                    <Loader2 className="animate-spin" size={40} color="var(--nuriek-blue)" />
                </div>
            ) : (
                <>
                    {signatureRequests.length > 0 && (
                        <section style={{ marginBottom: "3rem" }}>
                            <h2
                                className="cardTitle"
                                style={{
                                    marginBottom: "1.5rem",
                                    color: "#ff9500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}
                            >
                                <PenTool size={20} />
                                Signature Requests
                            </h2>
                            <div className="docGrid">{signatureRequests.map((doc) => renderDocCard(doc, "warning"))}</div>
                        </section>
                    )}

                    {employeeDocuments.length > 0 && (
                        <section style={{ marginBottom: "3rem" }}>
                            <h2 className="cardTitle" style={{ marginBottom: "1.5rem" }}>
                                My employment documents
                            </h2>
                            <div className="docGrid">
                                {employeeDocuments.map((doc) => renderDocCard(doc))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 className="cardTitle" style={{ marginBottom: "1.5rem" }}>
                            Company Policies & Resources
                        </h2>
                        <div className="docGrid">
                            {generalPolicies.length > 0 ? (
                                generalPolicies.map((doc) => renderDocCard(doc))
                            ) : (
                                <p style={{ color: "var(--text-tertiary)" }}>No policy documents yet.</p>
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
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: "rgba(0,0,0,0.8)",
                        zIndex: 1100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(5px)",
                    }}
                >
                    <div
                        style={{
                            width: "500px",
                            background: "white",
                            borderRadius: "12px",
                            padding: "2rem",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "1.5rem",
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Sign Document</h2>
                                <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                                    {signingDoc.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSigningDoc(null)}
                                style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div
                            style={{
                                border: "2px dashed #ccc",
                                borderRadius: "8px",
                                marginBottom: "1rem",
                                position: "relative",
                                height: "200px",
                                background: "#f9f9f9",
                            }}
                        >
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
                                style={{ width: "100%", height: "100%", touchAction: "none" }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "0.5rem",
                                    left: "0.5rem",
                                    color: "#999",
                                    fontSize: "0.75rem",
                                    pointerEvents: "none",
                                }}
                            >
                                Draw your signature above
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button
                                type="button"
                                onClick={clearSignature}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: "none",
                                    border: "none",
                                    color: "#ff453a",
                                    cursor: "pointer",
                                }}
                            >
                                <Eraser size={16} />
                                <span>Clear</span>
                            </button>
                            <button
                                type="button"
                                onClick={submitSignature}
                                disabled={isSigning}
                                style={{
                                    background: "var(--nuriek-blue)",
                                    color: "white",
                                    border: "none",
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}
                            >
                                {isSigning ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirm & Sign</span>
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
