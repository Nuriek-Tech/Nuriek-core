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
    Eraser
} from "lucide-react";
import "./documents.css";

// Helper to make Image work in client component
function Image({ src, alt, width, height }: any) {
    return <img src={src} alt={alt} width={width} height={height} />;
}

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DocumentsPage() {
    const { data: session } = useSession();
    const currentUserRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<any>(null);
    const [signingDoc, setSigningDoc] = useState<any>(null);
    const [isSigning, setIsSigning] = useState(false);

    // Canvas State
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
                const data = await res.json();
                setDocuments(data.filter((d: any) => d.type !== 'DRIVE'));
            }
        } catch (error) {
            console.error("Failed to fetch documents");
        } finally {
            setIsLoading(false);
        }
    };

    const startDrawing = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const submitSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsSigning(true);
        const signatureImage = canvas.toDataURL();

        try {
            const res = await fetch("/api/documents/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentId: signingDoc.id,
                    signature: signatureImage
                })
            });

            if (res.ok) {
                fetchDocs();
                setSigningDoc(null);
                alert("Document signed successfully!");
            } else {
                alert("Failed to sign document.");
            }
        } catch (error) {
            alert("Error submitting signature.");
        } finally {
            setIsSigning(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'POLICY': return BookOpen;
            case 'LEGAL': return Shield;
            default: return FileText;
        }
    };

    const signatureRequests = documents.filter(doc => !doc.isSigned && (doc.status === 'PENDING' || doc.status === 'PARTIALLY_SIGNED'));
    const generalPolicies = documents.filter(doc => doc.type === 'POLICY');

    return (
        <div className="docContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Documents & Policy Hub</h1>
                    <p>Access your contracts, policies, and company handbooks</p>
                </div>
                {["FOUNDER", "HR_ADMIN"].includes(currentUserRole) && (
                    <Link href="/admin/documents" className="checkInButton" style={{ textDecoration: 'none' }}>
                        <Shield size={18} />
                        <span>Admin Document Portal</span>
                    </Link>
                )}
            </header>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--nuriek-blue)" />
                </div>
            ) : (
                <>
                    {signatureRequests.length > 0 && (
                        <section style={{ marginBottom: '3rem' }}>
                            <h2 className="cardTitle" style={{ marginBottom: '1.5rem', color: '#ff9500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <PenTool size={20} />
                                Signature Requests
                            </h2>
                            <div className="docGrid">
                                {signatureRequests.map((doc) => {
                                    const Icon = getIcon(doc.type);
                                    return (
                                        <div key={doc.id} className="docCard glass" style={{ borderColor: 'rgba(255, 149, 0, 0.3)' }}>
                                            <div className="docHeader">
                                                <div className="docTitleSection">
                                                    <Icon className="docIcon" size={24} color="#ff9500" />
                                                    <div className="docMeta">
                                                        <span className="docTitle">{doc.title}</span>
                                                        <span className="docStatus statusPending">ACTION REQUIRED</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="docDescription">{doc.description || "Multi-party signature required."}</p>
                                            <div className="docFooter">
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                                                        <span style={{ color: '#ff9500' }}>Signature Progress</span>
                                                        <span>{doc.signedCount} / {doc.totalSigners} signed</span>
                                                    </div>
                                                    <div style={{ height: '4px', background: 'rgba(255, 149, 0, 0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }}>
                                                        <div style={{ width: `${(doc.signedCount / doc.totalSigners) * 100}%`, height: '100%', background: '#ff9500', transition: 'width 0.3s ease' }} />
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                                        {doc.requiredSigners?.map((s: any, i: number) => (
                                                            <div key={i} title={`${s.role}: ${s.email}`} style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: s.signedAt ? '#34c759' : 'rgba(0,0,0,0.05)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.6rem',
                                                                color: s.signedAt ? 'white' : '#999',
                                                                border: s.signedAt ? 'none' : '1px dashed #ccc'
                                                            }}>
                                                                {s.signedAt ? <CheckCircle2 size={12} /> : s.role[0]}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', alignItems: 'flex-end' }}>
                                                    <button className="docAction" onClick={() => setViewingDoc(doc)}>
                                                        <Eye size={14} />
                                                        <span>View</span>
                                                    </button>
                                                    <button
                                                        className="docAction"
                                                        onClick={() => setSigningDoc(doc)}
                                                        style={{ background: '#ff9500', color: 'white', borderColor: '#ff9500' }}
                                                    >
                                                        <PenTool size={14} />
                                                        <span>Sign</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 className="cardTitle" style={{ marginBottom: '1.5rem' }}>Company Policies & Resources</h2>
                        <div className="docGrid">
                            {generalPolicies.map((doc) => {
                                const Icon = getIcon(doc.type);
                                const isSigned = doc.isSigned;
                                return (
                                    <div key={doc.id} className="docCard glass">
                                        <div className="docHeader">
                                            <div className="docTitleSection">
                                                <Icon className="docIcon" size={24} />
                                                <div className="docMeta">
                                                    <span className="docTitle">{doc.title}</span>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                                        <span className={`docStatus ${isSigned ? 'statusOnTime' : 'statusPending'}`}
                                                            style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                            {isSigned ? 'SIGNED & VERIFIED' : doc.type}
                                                        </span>
                                                        {isSigned && <CheckCircle2 size={12} color="#34c759" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="docDescription">{doc.description}</p>
                                        <div className="docFooter">
                                            <span className="docDate">Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="docAction" onClick={() => setViewingDoc(doc)}>
                                                    <Eye size={14} />
                                                    <span>View</span>
                                                </button>
                                                {!isSigned && (
                                                    <button
                                                        className="docAction"
                                                        onClick={() => setSigningDoc(doc)}
                                                        style={{ background: 'var(--nuriek-blue)', color: 'white', borderColor: 'var(--nuriek-blue)' }}
                                                    >
                                                        <PenTool size={14} />
                                                        <span>Sign Now</span>
                                                    </button>
                                                )}
                                                {isSigned && (
                                                    <button className="docAction" disabled style={{ opacity: 0.6, cursor: 'default' }}>
                                                        <CheckCircle2 size={14} />
                                                        <span>Signed</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            {/* Secure PDF Viewer Modal */}
            {viewingDoc && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column',
                    padding: '2rem', backdropFilter: 'blur(8px)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'white' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{viewingDoc.title}</h2>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Secure Viewer - Download Restricted</p>
                        </div>
                        <button
                            onClick={() => setViewingDoc(null)}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ flex: 1, background: 'white', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '40px', background: 'transparent', zIndex: 10 }} />
                        <iframe
                            src={`${viewingDoc.url}#toolbar=0&navpanes=0&scrollbar=0`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title={viewingDoc.title}
                        />
                    </div>
                </div>
            )}

            {/* Native Signature Modal */}
            {signingDoc && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{ width: '500px', background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Sign Document</h2>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>{signingDoc.title}</p>
                            </div>
                            <button onClick={() => setSigningDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ border: '2px dashed #ccc', borderRadius: '8px', marginBottom: '1rem', position: 'relative', height: '200px', background: '#f9f9f9' }}>
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
                                style={{ width: '100%', height: '100%', touchAction: 'none' }}
                            />
                            <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', color: '#999', fontSize: '0.75rem', pointerEvents: 'none' }}>
                                Draw your signature above
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button onClick={clearSignature} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <Eraser size={16} />
                                <span>Clear</span>
                            </button>

                            <button
                                onClick={submitSignature}
                                disabled={isSigning}
                                style={{
                                    background: 'var(--nuriek-blue)', color: 'white', border: 'none',
                                    padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                {isSigning ? <Loader2 className="animate-spin" size={18} /> : (
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
