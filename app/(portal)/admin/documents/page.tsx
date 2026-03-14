"use client";

import { useState, useEffect } from "react";
import {
    FileUp,
    User,
    CheckCircle2,
    Clock,
    Loader2,
    Search,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import "@/styles/dashboard.css";

export default function AdminDocumentsPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [signers, setSigners] = useState<any[]>([
        { email: "", role: "EMPLOYEE", userId: "" }
    ]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        url: "",
        type: "LEGAL"
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    const addSigner = () => {
        setSigners([...signers, { email: "", role: "SIGNER", userId: "" }]);
    };

    const removeSigner = (index: number) => {
        setSigners(signers.filter((_, i) => i !== index));
    };

    const updateSigner = (index: number, field: string, value: string) => {
        const newSigners = [...signers];
        if (field === 'userId') {
            const user = users.find(u => u.id === value);
            newSigners[index].userId = value;
            newSigners[index].email = user?.email || "";
        } else {
            (newSigners[index] as any)[field] = value;
        }
        setSigners(newSigners);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    signers,
                    allowedRoles: "ALL"
                })
            });

            if (res.ok) {
                alert("Document uploaded with dynamic signature flow!");
                setFormData({ title: "", description: "", url: "", type: "LEGAL" });
                setSigners([{ email: "", role: "EMPLOYEE", userId: "" }]);
            } else {
                alert("Failed to upload document");
            }
        } catch (error) {
            alert("Upload error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <Link href="/documents" style={{ color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={20} />
                        </Link>
                        <h1>Admin <span className="text-gradient">Document Manager</span></h1>
                    </div>
                    <p>Issue documents and track multi-party signature flows</p>
                </div>
            </header>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <form onSubmit={handleUpload} className="card glass" style={{ padding: '2rem' }}>
                    <h2 className="cardTitle" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileUp size={20} color="var(--nuriek-blue)" />
                        Issue Multi-Party Document
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div className="inputGroup">
                            <label className="statLabel">Document Title</label>
                            <input
                                required
                                className="input"
                                placeholder="e.g. Employee Contract - John Doe"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="inputGroup">
                            <label className="statLabel" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Required Signers</span>
                                <button type="button" onClick={addSigner} style={{ background: 'none', border: 'none', color: 'var(--nuriek-blue)', fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Signer</button>
                            </label>

                            {signers.map((signer, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <select
                                            className="input"
                                            value={signer.userId}
                                            onChange={(e) => updateSigner(index, 'userId', e.target.value)}
                                            style={{ marginBottom: '0.25rem' }}
                                        >
                                            <option value="">Select Portal User (Optional)</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                        <input
                                            required
                                            className="input"
                                            placeholder="or enter email address"
                                            value={signer.email}
                                            onChange={(e) => updateSigner(index, 'email', e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="input"
                                        style={{ width: '120px' }}
                                        value={signer.role}
                                        onChange={(e) => updateSigner(index, 'role', e.target.value)}
                                    >
                                        <option value="HR">HR</option>
                                        <option value="DIRECTOR">Director</option>
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="PROSPECT">Prospect</option>
                                    </select>
                                    {signers.length > 1 && (
                                        <button type="button" onClick={() => removeSigner(index)} style={{ background: 'var(--danger-bg)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '4px' }}>
                                            <AlertCircle size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="inputGroup">
                            <label className="statLabel">Document URL (PDF)</label>
                            <input
                                required
                                className="input"
                                placeholder="https://example.com/offer-letter.pdf"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>

                        <div className="inputGroup">
                            <label className="statLabel">Short Description</label>
                            <textarea
                                className="input"
                                style={{ minHeight: '80px', paddingTop: '0.5rem' }}
                                placeholder="Brief instructions for the employee..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isUploading}
                            className="checkInButton"
                            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <FileUp size={18} />
                                    <span>Upload & Send for Signature</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="card glass" style={{ padding: '2rem' }}>
                    <h2 className="cardTitle" style={{ marginBottom: '1.5rem' }}>Active Signature Flows</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Summary of flows could go here */}
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>Loading active flows...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
