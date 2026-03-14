
"use client";

import { useState, useRef } from "react";
import { Upload, X, Check, AlertCircle } from "lucide-react";

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
}

export default function UploadDocumentModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [notify, setNotify] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const categories = ["Resources", "Templates", "Brand Assets", "Product Specs", "Policies", "General"];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                // Auto-fill title from filename
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
        formData.append("notify", notify.toString()); // Convert boolean to string

        try {
            const res = await fetch("/api/drive/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            onUploadSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="modalOverlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="card glass" style={{ maxWidth: '500px', width: '90%', padding: '2rem', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Upload Document</h2>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* File Drop Area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem',
                            textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {file ? (
                            <div style={{ color: 'var(--nuriek-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Check size={20} />
                                <span style={{ fontWeight: 500 }}>{file.name}</span>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-tertiary)' }}>
                                <Upload size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p>Click to select a file</p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Metadata Fields */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document Title"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the document..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '80px' }}
                        />
                    </div>

                    {/* Notification Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(var(--nuriek-blue-rgb), 0.1)', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            id="notify"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--nuriek-blue)' }}
                        />
                        <label htmlFor="notify" style={{ fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            Notify all employees & interns via email
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isUploading}
                        className="checkInButton"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', opacity: isUploading ? 0.7 : 1 }}
                    >
                        {isUploading ? "Uploading..." : "Upload & Publish"}
                    </button>
                </form>
            </div>
        </div>
    );
}
