"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Check, AlertCircle } from "lucide-react";
import { DRIVE_CATEGORIES } from "@/lib/constants";
import "@/app/(portal)/drive/drive.css";
import "@/app/(portal)/admin/documents/admin-documents.css";

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
    defaultCategory?: string;
}

export default function UploadDocumentModal({
    isOpen,
    onClose,
    onUploadSuccess,
    defaultCategory = "General",
}: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState(defaultCategory);
    const [notify, setNotify] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCategory(defaultCategory || "General");
        }
    }, [isOpen, defaultCategory]);

    if (!isOpen) return null;

    const categories = [...DRIVE_CATEGORIES];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!file || !title) {
            setError("Please select a file and provide a title.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("notify", notify.toString());

        try {
            const res = await fetch("/api/drive/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    (data as { error?: string }).error ||
                        `Upload failed (${res.status}). Sign out and sign in again if you are an admin.`
                );
            }

            onUploadSuccess();
            setFile(null);
            setTitle("");
            setDescription("");
            setCategory(defaultCategory || "General");
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="drvModalOverlay" onClick={onClose} role="presentation">
            <div
                className="drvModal glass"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="upload-modal-title"
            >
                <button
                    type="button"
                    className="drvModalClose"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <h2 id="upload-modal-title" className="drvModalTitle">
                    Upload to drive
                </h2>

                {error && (
                    <div className="drvError">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="admFormStack">
                    <div
                        className={`drvDropZone ${file ? "drvDropZone--hasFile" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                    >
                        {file ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    fontWeight: 600,
                                }}
                            >
                                <Check size={20} />
                                {file.name}
                            </div>
                        ) : (
                            <>
                                <Upload
                                    size={32}
                                    style={{ marginBottom: "0.5rem", opacity: 0.5 }}
                                />
                                <p style={{ color: "var(--text-tertiary)", margin: 0 }}>
                                    Click to select a file
                                </p>
                            </>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="admField">
                        <label className="admLabel">Title</label>
                        <input
                            type="text"
                            className="admInput"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document title"
                            required
                        />
                    </div>

                    <div className="admField">
                        <label className="admLabel">Folder</label>
                        <select
                            className="admInput"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admField">
                        <label className="admLabel">Description (optional)</label>
                        <textarea
                            className="admInput admTextarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description for employees…"
                            rows={3}
                        />
                    </div>

                    <label className="drvNotifyRow">
                        <input
                            type="checkbox"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            style={{ marginTop: "0.15rem", accentColor: "var(--nuriek-blue)" }}
                        />
                        <span>Notify all employees & interns via email</span>
                    </label>

                    <button
                        type="submit"
                        disabled={isUploading}
                        className="admSubmitBtn"
                        style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}
                    >
                        {isUploading ? "Uploading…" : "Upload & publish"}
                    </button>
                </form>
            </div>
        </div>
    );
}
