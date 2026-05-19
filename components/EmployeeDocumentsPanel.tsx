"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, FileUp, Eye, Loader2, Trash2, PenTool } from "lucide-react";
import type { DocumentRecord } from "@/lib/api-types";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import DeleteDocumentModal from "@/components/DeleteDocumentModal";

type Props = {
    userId: string;
    employeeName: string;
    canManage: boolean;
};

export default function EmployeeDocumentsPanel({ userId, employeeName, canManage }: Props) {
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [requiresSignature, setRequiresSignature] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
    const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);

    const loadDocs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/documents/employee?userId=${userId}`);
            if (res.ok) setDocuments(await res.json());
        } catch {
            console.error("Failed to load employee documents");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title.trim()) {
            alert("Title and PDF file are required.");
            return;
        }
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            body.append("title", title.trim());
            body.append("description", description);
            body.append("userId", userId);
            body.append("requiresSignature", String(requiresSignature));
            const res = await fetch("/api/documents/employee", { method: "POST", body });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setTitle("");
                setDescription("");
                setFile(null);
                setRequiresSignature(true);
                await loadDocs();
                const sent = (data as { emailsSent?: number }).emailsSent ?? 0;
                alert(
                    sent > 0
                        ? "Document uploaded. Employee notified by email."
                        : "Document uploaded and assigned to employee."
                );
            } else {
                alert((data as { error?: string }).error || "Upload failed");
            }
        } catch {
            alert("Upload error");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingDoc) return;
        const res = await fetch(`/api/documents/${deletingDoc.id}`, { method: "DELETE" });
        if (res.ok) {
            setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
            setDeletingDoc(null);
        } else {
            const data = await res.json().catch(() => ({}));
            alert((data as { error?: string }).error || "Failed to delete");
            throw new Error("delete failed");
        }
    };

    return (
        <section className="infoSection glass empDocsPanel">
            <div className="sectionHeader">
                <FileText size={20} />
                <span>Employee documents</span>
            </div>

            <p className="empDocsLead">
                Personal files for {employeeName} — contracts, ID copies, payslips, onboarding packs.
                {canManage
                    ? " Only this employee sees these in their Documents hub."
                    : " Visible only to you and HR."}
            </p>

            {canManage && (
                <form className="empDocsUpload" onSubmit={handleUpload}>
                    <div className="empDocsUploadGrid">
                        <input
                            type="text"
                            className="admInput"
                            placeholder="Document title *"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            className="admInput"
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <label className="empDocsFileLabel">
                            <FileUp size={16} />
                            {file ? file.name : "Choose PDF *"}
                            <input
                                type="file"
                                accept="application/pdf,.pdf"
                                hidden
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </label>
                        <label className="empDocsCheck">
                            <input
                                type="checkbox"
                                checked={requiresSignature}
                                onChange={(e) => setRequiresSignature(e.target.checked)}
                            />
                            Requires employee signature
                        </label>
                    </div>
                    <button type="submit" className="hubBtnPrimary empDocsSubmit" disabled={uploading}>
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                        Assign document
                    </button>
                </form>
            )}

            {loading ? (
                <div className="empDocsLoading">
                    <Loader2 className="animate-spin" size={22} />
                </div>
            ) : documents.length === 0 ? (
                <p className="empDocsEmpty">No employee-specific documents yet.</p>
            ) : (
                <ul className="empDocsList">
                    {documents.map((doc) => (
                        <li key={doc.id} className="empDocsItem">
                            <div className="empDocsItemMain">
                                <span className="empDocsItemTitle">{doc.title}</span>
                                {doc.description && (
                                    <span className="empDocsItemDesc">{doc.description}</span>
                                )}
                                <span className="empDocsItemMeta">
                                    {new Date(doc.updatedAt).toLocaleDateString()}
                                    {doc.totalSigners ? (
                                        <>
                                            {" · "}
                                            {doc.isSigned ? (
                                                <span className="empDocsSigned">Signed</span>
                                            ) : (
                                                <span className="empDocsPending">
                                                    <PenTool size={12} /> Signature pending
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        " · File only"
                                    )}
                                </span>
                            </div>
                            <div className="empDocsItemActions">
                                <button type="button" className="docAction" onClick={() => setViewingDoc(doc)}>
                                    <Eye size={14} />
                                    View
                                </button>
                                {canManage && (
                                    <button
                                        type="button"
                                        className="docAction"
                                        style={{ color: "#ef4444" }}
                                        onClick={() => setDeletingDoc(doc)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {viewingDoc && (
                <DocumentViewerModal
                    document={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                    canSign={false}
                    isSigned={Boolean(viewingDoc.isSigned)}
                    hasRead={Boolean(viewingDoc.hasRead)}
                    onReadComplete={() => {}}
                    onSign={() => {}}
                />
            )}

            <DeleteDocumentModal
                isOpen={Boolean(deletingDoc)}
                onClose={() => setDeletingDoc(null)}
                onDelete={handleDelete}
                fileName={deletingDoc?.title ?? "this document"}
            />
        </section>
    );
}
