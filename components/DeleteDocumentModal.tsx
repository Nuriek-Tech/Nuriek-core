"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => Promise<void>;
    fileName: string;
}

export default function DeleteDocumentModal({ isOpen, onClose, onDelete, fileName }: DeleteDocumentModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDelete();
        setIsDeleting(false);
        onClose();
    };

    return (
        <div className="modalOverlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div className="card glass" style={{ maxWidth: '400px', width: '90%', padding: '2rem', position: 'relative', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444'
                    }}>
                        <AlertTriangle size={32} />
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Delete File?</h2>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Are you sure you want to delete <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fileName}</span>? This action cannot be undone.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '0.75rem', borderRadius: '8px',
                                border: '1px solid var(--border)', background: 'transparent',
                                color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            style={{
                                flex: 1, padding: '0.75rem', borderRadius: '8px',
                                border: 'none', background: '#ef4444',
                                color: 'white', cursor: 'pointer', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                opacity: isDeleting ? 0.7 : 1
                            }}
                        >
                            {isDeleting ? "Deleting..." : <>Delete <Trash2 size={16} /></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
