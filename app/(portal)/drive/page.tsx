"use client";

import { useState, useEffect } from "react";
import {
    FileText,
    Folder,
    Search,
    Upload,
    MoreVertical,
    Star,
    Share2,
    Clock,
    HardDrive,
    Loader2,
    Trash2
} from "lucide-react";
import "@/styles/dashboard.css";
import UploadDocumentModal from "@/components/UploadDocumentModal";
import DeleteDocumentModal from "@/components/DeleteDocumentModal";
import { useSession } from "next-auth/react";

export default function DrivePage() {
    const { data: session } = useSession();
    const currentUserRole = (session?.user as any)?.role;
    const isAdmin = currentUserRole === "FOUNDER" || currentUserRole === "HR_ADMIN";

    const [documents, setDocuments] = useState<{ id: string; title: string; url: string; category: string; size: number; updatedAt: string; description?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<any | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Deletion State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string, title: string } | null>(null);

    // Sidebar View State
    const [viewMode, setViewMode] = useState<'ALL' | 'SHARED' | 'STARRED' | 'RECENT'>('ALL');

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/documents?type=DRIVE");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch drive documents");
        } finally {
            setIsLoading(false);
        }
    };

    const categories = ["Resources", "Templates", "Brand Assets", "Product Specs", "Policies"];

    // Filter Logic
    const getFilteredDocs = () => {
        let docs = [...documents];

        // 1. Filter by View Mode
        if (viewMode === 'RECENT') {
            // Sort by updatedAt descending
            docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else if (viewMode === 'SHARED' || viewMode === 'STARRED') {
            // Placeholder: currently show empty or filtered if backend supported
            // For now, let's just show All but maybe we can mock it
            // docs = []; // Or filter by some future flag
        }

        // 2. Filter by Category (only if in ALL View)
        if (viewMode === 'ALL' && selectedCategory) {
            docs = docs.filter(doc => doc.category === selectedCategory);
        }

        // 3. Search
        if (searchQuery) {
            docs = docs.filter(doc =>
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.category?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return docs;
    };

    const filteredDocs = getFilteredDocs();

    const handleOpenDoc = (doc: any) => {
        setViewingDoc(doc);
    };

    const confirmDelete = (e: React.MouseEvent, doc: { id: string, title: string }) => {
        e.stopPropagation();
        setDocToDelete(doc);
        setDeleteModalOpen(true);
    };

    const handleExecuteDelete = async () => {
        if (!docToDelete) return;
        try {
            const res = await fetch(`/api/drive/${docToDelete.id}`, { method: "DELETE" });
            if (res.ok) {
                setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
                setDeleteModalOpen(false);
                setDocToDelete(null);
            } else {
                alert("Failed to delete file");
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Delete failed");
        }
    };

    // Sidebar Button style helper
    const getSidebarButtonStyle = (mode: string) => ({
        border: 'none',
        background: viewMode === mode ? 'rgba(var(--nuriek-blue-rgb), 0.1)' : 'transparent',
        color: viewMode === mode ? 'var(--nuriek-blue)' : 'var(--text-secondary)',
        cursor: 'pointer',
        justifyContent: 'flex-start',
        paddingLeft: '1rem'
    });

    return (
        <div className="docContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Company Drive & Handbooks</h1>
                    <p>Access shared files, assets, and project resources</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="searchBar" style={{ width: '300px' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search in drive..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <button className="checkInButton" onClick={() => setIsUploadModalOpen(true)}>
                            <Upload size={18} />
                            <span>Upload File</span>
                        </button>
                    )}
                </div>
            </header>

            <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
                <aside className="card glass" style={{ height: 'fit-content' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            className={`logItem ${viewMode === 'ALL' ? 'active' : ''}`}
                            style={getSidebarButtonStyle('ALL')}
                            onClick={() => { setViewMode('ALL'); setSelectedCategory(null); }}
                        >
                            <HardDrive size={18} />
                            <span>All Files</span>
                        </button>
                        <button
                            className="logItem"
                            style={getSidebarButtonStyle('SHARED')}
                            onClick={() => setViewMode('SHARED')}
                        >
                            <Share2 size={18} />
                            <span>Shared with me</span>
                        </button>
                        <button
                            className="logItem"
                            style={getSidebarButtonStyle('STARRED')}
                            onClick={() => setViewMode('STARRED')}
                        >
                            <Star size={18} />
                            <span>Starred</span>
                        </button>
                        <button
                            className="logItem"
                            style={getSidebarButtonStyle('RECENT')}
                            onClick={() => setViewMode('RECENT')}
                        >
                            <Clock size={18} />
                            <span>Recent</span>
                        </button>
                    </nav>

                    <div style={{ marginTop: '2rem' }}>
                        <span className="statLabel" style={{ paddingLeft: '0.5rem' }}>Storage</span>
                        <div style={{ padding: '0.5rem' }}>
                            {(() => {
                                const totalBytes = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
                                const totalGB = 10;
                                const usedGB = totalBytes / (1024 * 1024 * 1024);
                                const percentage = Math.min((usedGB / totalGB) * 100, 100);
                                return (
                                    <>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--nuriek-blue)' }} />
                                        </div>
                                        <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--text-tertiary)' }}>
                                            {usedGB.toFixed(2)} GB of {totalGB} GB used
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </aside>

                <main>
                    {viewMode === 'ALL' && (
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h2 className="cardTitle">Folders</h2>
                                {selectedCategory && (
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        style={{ background: 'none', color: 'var(--nuriek-blue)', border: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
                                    >
                                        View All Folders
                                    </button>
                                )}
                            </div>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                {categories.map((folder) => (
                                    <div
                                        key={folder}
                                        className={`card glass folderCard ${selectedCategory === folder ? 'selected' : ''}`}
                                        style={{
                                            padding: '1rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            border: selectedCategory === folder ? '1px solid var(--nuriek-blue)' : '1px solid rgba(255,255,255,0.1)',
                                            background: selectedCategory === folder ? 'rgba(var(--nuriek-blue-rgb), 0.05)' : 'rgba(255,255,255,0.02)'
                                        }}
                                        onClick={() => setSelectedCategory(folder)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Folder color={folder === "Policies" ? "#34c759" : "#4a90e2"} fill={folder === "Policies" ? "#34c75922" : "#4a90e222"} />
                                            <MoreVertical size={16} />
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <p style={{ fontWeight: '500' }}>{folder}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                {documents.filter(d => d.category === folder).length} files
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section style={{ marginTop: viewMode === 'ALL' ? '3rem' : '0' }}>
                        <h2 className="cardTitle" style={{ marginBottom: '1rem' }}>
                            {viewMode === 'RECENT' ? "Recent Files" : selectedCategory ? `${selectedCategory} Files` : "All Documents"}
                        </h2>
                        <div className="card glass" style={{ padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Category</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Last Modified</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                                                <Loader2 className="animate-spin" />
                                            </td>
                                        </tr>
                                    ) : filteredDocs.length > 0 ? (
                                        filteredDocs.map((doc) => (
                                            <tr key={doc.id} className="logItem" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => handleOpenDoc(doc)}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                        <FileText size={18} className="text-blue-400" />
                                                        <span>{doc.title}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', opacity: 0.7 }}>{doc.category || "General"}</td>
                                                <td style={{ padding: '1rem', opacity: 0.7 }}>{new Date(doc.updatedAt).toLocaleDateString()}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={(e) => confirmDelete(e, { id: doc.id, title: doc.title })}
                                                                style={{ color: '#ef4444', padding: '0.5rem', borderRadius: '4px', opacity: 0.8, cursor: 'pointer' }}
                                                                title="Delete File"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                        <button className="text-blue-400" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>View</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                                {searchQuery ? "No matching files found." : "No files found."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>

            {/* Document Preview Modal */}
            {viewingDoc && (
                <div className="modalOverlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(5px)'
                }} onClick={() => setViewingDoc(null)}>
                    <div className="card glass" style={{ maxWidth: '600px', width: '90%', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '16px',
                                background: 'rgba(var(--nuriek-blue-rgb), 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem', color: 'var(--nuriek-blue)'
                            }}>
                                <FileText size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{viewingDoc.title}</h2>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>{viewingDoc.category}</p>
                        </header>

                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description</h4>
                            <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{viewingDoc.description || "Official company document for employee review."}</p>
                        </div>

                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button className="checkInButton" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.open(viewingDoc.url, '_blank')}>
                                <span>Download PDF</span>
                            </button>
                            <button style={{
                                width: '100%', padding: '0.75rem', borderRadius: '12px',
                                border: '1px solid var(--border)', background: 'none', color: 'white',
                                cursor: 'pointer', fontWeight: 600
                            }} onClick={() => setViewingDoc(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={() => {
                    fetchDocs();
                }}
            />

            <DeleteDocumentModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onDelete={handleExecuteDelete}
                fileName={docToDelete?.title || "Document"}
            />
        </div>
    );
}
