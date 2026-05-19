"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import type { DocumentRecord } from "@/lib/api-types";

type Props = {
    document: DocumentRecord | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
};

export default function EditDocumentModal({ document: doc, isOpen, onClose, onSaved }: Props) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("LEGAL");
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState("PENDING");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (doc) {
            setTitle(doc.title);
            setDescription(doc.description || "");
            setType(doc.type);
            setUrl(doc.url);
            setStatus(doc.status);
        }
    }, [doc]);

    if (!isOpen || !doc) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`/api/documents/${doc.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, type, url, status }),
            });
            if (res.ok) {
                onSaved();
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                alert((data as { error?: string }).error || "Failed to update document");
            }
        } catch {
            alert("Failed to update document");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="modalOverlay"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1200,
                backdropFilter: "blur(5px)",
            }}
            onClick={onClose}
        >
            <form
                className="card glass"
                style={{ maxWidth: "480px", width: "90%", padding: "2rem", position: "relative" }}
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Edit Document</h2>
                    <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label className="statLabel">Title</label>
                        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className="statLabel">Type</label>
                        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="LEGAL">Legal / NDA</option>
                            <option value="POLICY">Company Policy</option>
                        </select>
                    </div>
                    <div>
                        <label className="statLabel">Status</label>
                        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="PENDING">Pending</option>
                            <option value="PARTIALLY_SIGNED">Partially signed</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                    <div>
                        <label className="statLabel">PDF URL</label>
                        <input className="input" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/api/files/..." />
                    </div>
                    <div>
                        <label className="statLabel">Description</label>
                        <textarea
                            className="input"
                            style={{ minHeight: "72px" }}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="checkInButton"
                    style={{ width: "100%", justifyContent: "center", marginTop: "1.5rem" }}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>{saving ? "Saving…" : "Save changes"}</span>
                </button>
            </form>
        </div>
    );
}
