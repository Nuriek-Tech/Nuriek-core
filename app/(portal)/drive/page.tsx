"use client";

import { useState, useEffect, useMemo } from "react";
import {
    FileText,
    Folder,
    Search,
    Upload,
    Star,
    Share2,
    Clock,
    HardDrive,
    Loader2,
    Trash2,
    BookOpen,
    LayoutTemplate,
    Palette,
    Box,
    Shield,
    LayoutGrid,
    List,
    ExternalLink,
    FolderInput,
    RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DRIVE_CATEGORIES } from "@/lib/constants";
import "@/styles/people-hub.css";
import "../admin/documents/admin-documents.css";
import "./drive.css";
import UploadDocumentModal from "@/components/UploadDocumentModal";
import DeleteDocumentModal from "@/components/DeleteDocumentModal";
import { useSession } from "next-auth/react";
import type { DocumentRecord } from "@/lib/api-types";

type DriveDocument = Pick<
    DocumentRecord,
    "id" | "title" | "url" | "category" | "size" | "updatedAt" | "description"
>;

type ViewMode = "ALL" | "SHARED" | "STARRED" | "RECENT";
type DisplayMode = "grid" | "list";

const FOLDER_META: Record<
    string,
    { icon: LucideIcon; color: string; bg: string; hint: string }
> = {
    General: {
        icon: Folder,
        color: "#4a90e2",
        bg: "rgba(74, 144, 226, 0.12)",
        hint: "Shared company files",
    },
    Resources: {
        icon: BookOpen,
        color: "#5ac8fa",
        bg: "rgba(90, 200, 250, 0.12)",
        hint: "Learning & guides",
    },
    Templates: {
        icon: LayoutTemplate,
        color: "#bf5af2",
        bg: "rgba(191, 90, 242, 0.12)",
        hint: "Reusable templates",
    },
    "Brand Assets": {
        icon: Palette,
        color: "#ff2d55",
        bg: "rgba(255, 45, 85, 0.12)",
        hint: "Logos & brand kit",
    },
    "Product Specs": {
        icon: Box,
        color: "#ff9f0a",
        bg: "rgba(255, 159, 10, 0.12)",
        hint: "Product documentation",
    },
    Policies: {
        icon: Shield,
        color: "#34c759",
        bg: "rgba(52, 199, 89, 0.12)",
        hint: "Handbooks & HR policies",
    },
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DrivePage() {
    const { data: session } = useSession();
    const currentUserRole = session?.user?.role;
    const isAdmin = currentUserRole === "FOUNDER" || currentUserRole === "HR_ADMIN";

    const [documents, setDocuments] = useState<DriveDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<DriveDocument | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("ALL");
    const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
    const [movingId, setMovingId] = useState<string | null>(null);
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

    const categories = [...DRIVE_CATEGORIES];

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const res = await fetch("/api/drive", { cache: "no-store" });
            if (res.ok) {
                setDocuments(await res.json());
            } else {
                const data = await res.json().catch(() => ({}));
                setFetchError((data as { error?: string }).error || "Failed to load files");
                setDocuments([]);
            }
        } catch {
            setFetchError("Failed to load files. Please refresh the page.");
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDocs = useMemo(() => {
        let docs = [...documents];

        if (viewMode === "RECENT") {
            docs.sort(
                (a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        }

        if (viewMode === "ALL" && selectedCategory) {
            docs = docs.filter((doc) => (doc.category || "General") === selectedCategory);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(
                (doc) =>
                    doc.title.toLowerCase().includes(q) ||
                    doc.category?.toLowerCase().includes(q) ||
                    doc.description?.toLowerCase().includes(q)
            );
        }

        return docs;
    }, [documents, viewMode, selectedCategory, searchQuery]);

    const policyDocs = useMemo(
        () => documents.filter((d) => (d.category || "General") === "Policies"),
        [documents]
    );

    const recentCount = useMemo(() => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return documents.filter((d) => new Date(d.updatedAt).getTime() >= weekAgo).length;
    }, [documents]);

    const totalBytes = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
    const totalGB = 10;
    const usedGB = totalBytes / (1024 * 1024 * 1024);
    const storagePct = Math.min((usedGB / totalGB) * 100, 100);

    const fileHref = (url: string) => (url.startsWith("http") ? url : url);

    const handleOpenDoc = (doc: DriveDocument) => setViewingDoc(doc);

    const handleDownload = (doc: DriveDocument) => {
        window.open(fileHref(doc.url), "_blank", "noopener,noreferrer");
    };

    const moveToFolder = async (docId: string, folder: string) => {
        setMovingId(docId);
        try {
            const res = await fetch(`/api/drive/${docId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: folder }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert((data as { error?: string }).error || "Failed to move file");
                return;
            }
            const updated = await res.json();
            setDocuments((prev) =>
                prev.map((d) =>
                    d.id === docId
                        ? { ...d, category: updated.category, updatedAt: updated.updatedAt }
                        : d
                )
            );
            if (viewingDoc?.id === docId) {
                setViewingDoc((v) => (v ? { ...v, category: updated.category } : v));
            }
        } catch {
            alert("Failed to move file");
        } finally {
            setMovingId(null);
            setDragOverFolder(null);
        }
    };

    const confirmDelete = (e: React.MouseEvent, doc: { id: string; title: string }) => {
        e.stopPropagation();
        setDocToDelete(doc);
        setDeleteModalOpen(true);
    };

    const handleExecuteDelete = async () => {
        if (!docToDelete) return;
        try {
            const res = await fetch(`/api/drive/${docToDelete.id}`, { method: "DELETE" });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
                setDeleteModalOpen(false);
                setDocToDelete(null);
                if (viewingDoc?.id === docToDelete.id) setViewingDoc(null);
            } else {
                alert("Failed to delete file");
            }
        } catch {
            alert("Delete failed");
        }
    };

    const navItems: { mode: ViewMode; icon: LucideIcon; label: string; soon?: boolean }[] = [
        { mode: "ALL", icon: HardDrive, label: "All files" },
        { mode: "RECENT", icon: Clock, label: "Recent" },
        { mode: "SHARED", icon: Share2, label: "Shared", soon: true },
        { mode: "STARRED", icon: Star, label: "Starred", soon: true },
    ];

    const pageSubtitle = isAdmin
        ? "Shared files, brand assets, templates, and company handbooks."
        : "Policies, handbooks, and resources published for your role.";

    const listTitle =
        viewMode === "RECENT"
            ? "Recent files"
            : selectedCategory
              ? `${selectedCategory}`
              : "All files";

    return (
        <div className="hubPage driveHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <p className="hubEyebrow">{isAdmin ? "Knowledge base" : "Resources"}</p>
                    <h1>
                        {isAdmin ? (
                            <>
                                Company <span className="text-gradient">Drive</span>
                            </>
                        ) : (
                            <>
                                Employee <span className="text-gradient">Handbook</span>
                            </>
                        )}
                    </h1>
                    <p className="hubSubtitle">{pageSubtitle}</p>
                </div>
                <div className="hubHeroActions">
                    <button
                        type="button"
                        className="hubStatChip"
                        onClick={() => fetchDocs()}
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    {isAdmin && (
                        <button
                            type="button"
                            className="hubBtnPrimary"
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            <Upload size={18} />
                            Upload file
                        </button>
                    )}
                </div>
            </header>

            <div className="hubKpiGrid">
                <div className="hubKpiCard glass">
                    <span className="hubKpiLabel">Total files</span>
                    <span className="hubKpiValue hubKpiValue--blue">{documents.length}</span>
                </div>
                <div className="hubKpiCard glass">
                    <span className="hubKpiLabel">Handbooks & policies</span>
                    <span className="hubKpiValue hubKpiValue--green">{policyDocs.length}</span>
                </div>
                <div className="hubKpiCard glass">
                    <span className="hubKpiLabel">Updated this week</span>
                    <span className="hubKpiValue hubKpiValue--orange">{recentCount}</span>
                </div>
                <div className="hubKpiCard glass">
                    <span className="hubKpiLabel">Storage used</span>
                    <span className="hubKpiValue hubKpiValue--default">
                        {usedGB < 0.01 ? formatBytes(totalBytes) : `${usedGB.toFixed(2)} GB`}
                    </span>
                </div>
            </div>

            {!isAdmin && policyDocs.length > 0 && (
                <div className="driveFeatured">
                    <button
                        type="button"
                        className="driveFeaturedCard glass"
                        onClick={() => {
                            setViewMode("ALL");
                            setSelectedCategory("Policies");
                        }}
                    >
                        <div className="driveFeaturedIcon">
                            <Shield size={22} />
                        </div>
                        <div>
                            <div className="driveFeaturedTitle">Policies & handbooks</div>
                            <p className="driveFeaturedSub">
                                {policyDocs.length} document{policyDocs.length !== 1 ? "s" : ""} — tap to browse
                            </p>
                        </div>
                    </button>
                </div>
            )}

            {isAdmin && (
                <p className="driveAdminHint">
                    <strong>Admin:</strong> Drag a file row onto a folder card, or use the folder dropdown in the table to reorganize.
                    {selectedCategory ? ` New uploads default to “${selectedCategory}”.` : ""}
                </p>
            )}

            <div className="driveLayout">
                <aside className="driveSidebar glass">
                    <nav>
                        {navItems.map(({ mode, icon: Icon, label, soon }) => (
                            <button
                                key={mode}
                                type="button"
                                className={`driveNavBtn ${viewMode === mode ? "driveNavBtn--active" : ""} ${soon ? "driveNavBtn--muted" : ""}`}
                                onClick={() => {
                                    if (soon) return;
                                    setViewMode(mode);
                                    if (mode !== "ALL") setSelectedCategory(null);
                                }}
                                disabled={soon}
                            >
                                <Icon size={18} />
                                {label}
                                {soon && <span className="driveNavBadge">Soon</span>}
                            </button>
                        ))}
                    </nav>

                    <div className="driveStorage">
                        <p className="driveStorageLabel">Storage</p>
                        <div className="driveStorageTrack">
                            <div
                                className="driveStorageFill"
                                style={{ width: `${storagePct}%` }}
                            />
                        </div>
                        <p className="driveStorageMeta">
                            {usedGB.toFixed(2)} GB of {totalGB} GB
                        </p>
                    </div>
                </aside>

                <main>
                    <div className="hubToolbar" style={{ marginBottom: "1rem" }}>
                        <div className="hubSearchWrap">
                            <Search size={18} />
                            <input
                                type="search"
                                className="hubSearchInput"
                                placeholder="Search files, folders, descriptions…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="driveViewToggle">
                            <button
                                type="button"
                                className={`driveViewBtn ${displayMode === "list" ? "driveViewBtn--active" : ""}`}
                                onClick={() => setDisplayMode("list")}
                                aria-label="List view"
                            >
                                <List size={18} />
                            </button>
                            <button
                                type="button"
                                className={`driveViewBtn ${displayMode === "grid" ? "driveViewBtn--active" : ""}`}
                                onClick={() => setDisplayMode("grid")}
                                aria-label="Grid view"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                        <span className="hubResultCount">
                            {filteredDocs.length} result{filteredDocs.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {viewMode === "ALL" && (
                        <section>
                            <div className="driveSectionHead">
                                <h2 className="driveSectionTitle">Folders</h2>
                                {selectedCategory && (
                                    <button
                                        type="button"
                                        className="driveClearFilter"
                                        onClick={() => setSelectedCategory(null)}
                                    >
                                        Clear folder ×
                                    </button>
                                )}
                            </div>
                            <div className="driveFolderGrid">
                                {categories.map((folder) => {
                                    const meta = FOLDER_META[folder] ?? FOLDER_META.General;
                                    const Icon = meta.icon;
                                    const count = documents.filter(
                                        (d) => (d.category || "General") === folder
                                    ).length;
                                    return (
                                        <button
                                            key={folder}
                                            type="button"
                                            className={`driveFolderCard glass ${
                                                selectedCategory === folder
                                                    ? "driveFolderCard--selected"
                                                    : ""
                                            } ${dragOverFolder === folder ? "driveFolderCard--drag" : ""}`}
                                            onClick={() =>
                                                setSelectedCategory(
                                                    selectedCategory === folder ? null : folder
                                                )
                                            }
                                            onDragOver={(e) => {
                                                if (!isAdmin) return;
                                                e.preventDefault();
                                                setDragOverFolder(folder);
                                            }}
                                            onDragLeave={() => setDragOverFolder(null)}
                                            onDrop={(e) => {
                                                if (!isAdmin) return;
                                                e.preventDefault();
                                                const docId = e.dataTransfer.getData("docId");
                                                if (docId) moveToFolder(docId, folder);
                                            }}
                                        >
                                            <div
                                                className="driveFolderIcon"
                                                style={{ background: meta.bg, color: meta.color }}
                                            >
                                                <Icon size={20} />
                                            </div>
                                            <p className="driveFolderName">{folder}</p>
                                            <p className="driveFolderMeta">
                                                {count} file{count !== 1 ? "s" : ""} · {meta.hint}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section>
                        <div className="driveSectionHead">
                            <h2 className="driveSectionTitle">
                                {listTitle}
                                {!isLoading && (
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            color: "var(--text-tertiary)",
                                            marginLeft: "0.35rem",
                                        }}
                                    >
                                        ({filteredDocs.length})
                                    </span>
                                )}
                            </h2>
                        </div>

                        {fetchError && (
                            <p style={{ color: "#ff3b30", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
                                {fetchError}
                            </p>
                        )}

                        {selectedCategory &&
                            filteredDocs.length === 0 &&
                            documents.length > 0 &&
                            !searchQuery && (
                                <p style={{ color: "#ff9f0a", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
                                    No files in “{selectedCategory}”.{" "}
                                    <button
                                        type="button"
                                        className="driveClearFilter"
                                        style={{ display: "inline", marginLeft: "0.25rem" }}
                                        onClick={() => setSelectedCategory(null)}
                                    >
                                        Show all files
                                    </button>
                                </p>
                            )}

                        <div className="driveFilePanel glass">
                            {isLoading ? (
                                <div className="hubLoading">
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            ) : filteredDocs.length === 0 ? (
                                <div className="hubEmpty">
                                    <FileText size={48} className="hubEmptyIcon" />
                                    <p>
                                        {searchQuery
                                            ? "No matching files found."
                                            : "No files in this view yet."}
                                    </p>
                                    {isAdmin && !searchQuery && (
                                        <button
                                            type="button"
                                            className="hubBtnPrimary"
                                            style={{ marginTop: "1rem" }}
                                            onClick={() => setIsUploadModalOpen(true)}
                                        >
                                            <Upload size={18} />
                                            Upload first file
                                        </button>
                                    )}
                                </div>
                            ) : displayMode === "grid" ? (
                                <div className="driveFileGrid">
                                    {filteredDocs.map((doc) => {
                                        const cat = doc.category || "General";
                                        const meta = FOLDER_META[cat] ?? FOLDER_META.General;
                                        const Icon = meta.icon;
                                        return (
                                            <div
                                                key={doc.id}
                                                className="driveFileCard"
                                                draggable={isAdmin}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("docId", doc.id);
                                                    e.dataTransfer.effectAllowed = "move";
                                                }}
                                                onClick={() => handleOpenDoc(doc)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) =>
                                                    e.key === "Enter" && handleOpenDoc(doc)
                                                }
                                            >
                                                <div
                                                    className="driveFileIcon"
                                                    style={{
                                                        background: meta.bg,
                                                        color: meta.color,
                                                    }}
                                                >
                                                    <Icon size={18} />
                                                </div>
                                                <p className="driveFileCardTitle">{doc.title}</p>
                                                <p className="driveFileCardMeta">
                                                    {cat} · {formatBytes(doc.size || 0)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <table className="driveTable">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Folder</th>
                                            <th>Size</th>
                                            <th>Modified</th>
                                            <th style={{ width: 100 }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDocs.map((doc) => (
                                            <tr
                                                key={doc.id}
                                                className="driveTableRow"
                                                draggable={isAdmin}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("docId", doc.id);
                                                    e.dataTransfer.effectAllowed = "move";
                                                }}
                                                onClick={() => handleOpenDoc(doc)}
                                            >
                                                <td>
                                                    <div className="driveFileName">
                                                        <div className="driveFileIcon">
                                                            <FileText size={18} />
                                                        </div>
                                                        {doc.title}
                                                    </div>
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    {isAdmin ? (
                                                        <select
                                                            className="admInput"
                                                            style={{
                                                                minWidth: 130,
                                                                padding: "0.35rem 0.5rem",
                                                                fontSize: "0.85rem",
                                                            }}
                                                            value={doc.category || "General"}
                                                            disabled={movingId === doc.id}
                                                            onChange={(e) =>
                                                                moveToFolder(doc.id, e.target.value)
                                                            }
                                                        >
                                                            {categories.map((c) => (
                                                                <option key={c} value={c}>
                                                                    {c}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className={`driveCatBadge ${
                                                                doc.category === "Policies"
                                                                    ? "driveCatBadge--policies"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {doc.category || "General"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ color: "var(--text-tertiary)" }}>
                                                    {formatBytes(doc.size || 0)}
                                                </td>
                                                <td style={{ color: "var(--text-tertiary)" }}>
                                                    {new Date(doc.updatedAt).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <div className="driveRowActions">
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                className="admIconBtn admIconBtn--danger admIconBtn--iconOnly"
                                                                onClick={(e) =>
                                                                    confirmDelete(e, {
                                                                        id: doc.id,
                                                                        title: doc.title,
                                                                    })
                                                                }
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="admIconBtn admIconBtn--iconOnly"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(doc);
                                                            }}
                                                            title="Open"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                </main>
            </div>

            {viewingDoc && (
                <div
                    className="drvModalOverlay"
                    onClick={() => setViewingDoc(null)}
                    role="presentation"
                >
                    <div
                        className="drvModal glass drvModal--wide"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="drive-preview-title"
                    >
                        <button
                            type="button"
                            className="drvModalClose"
                            onClick={() => setViewingDoc(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <div className="drvModalHero">
                            <div className="drvModalFileIcon">
                                <FileText size={32} />
                            </div>
                            <h2 id="drive-preview-title" className="drvModalFileTitle">
                                {viewingDoc.title}
                            </h2>
                            <span
                                className={`driveCatBadge ${
                                    viewingDoc.category === "Policies"
                                        ? "driveCatBadge--policies"
                                        : ""
                                }`}
                            >
                                {viewingDoc.category || "General"}
                            </span>
                        </div>

                        {isAdmin && (
                            <div className="admField" style={{ marginBottom: "1rem" }}>
                                <label className="admLabel">
                                    <FolderInput
                                        size={14}
                                        style={{ verticalAlign: "middle", marginRight: 4 }}
                                    />
                                    Move to folder
                                </label>
                                <select
                                    className="admInput"
                                    value={viewingDoc.category || "General"}
                                    disabled={movingId === viewingDoc.id}
                                    onChange={(e) =>
                                        moveToFolder(viewingDoc.id, e.target.value)
                                    }
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="drvDescBox">
                            <p className="drvDescLabel">Description</p>
                            <p className="drvDescText">
                                {viewingDoc.description ||
                                    "Official company document for employee review."}
                            </p>
                        </div>

                        <div className="drvModalActions">
                            <button
                                type="button"
                                className="admSubmitBtn"
                                style={{ justifyContent: "center" }}
                                onClick={() => handleDownload(viewingDoc)}
                            >
                                <ExternalLink size={18} />
                                Open / download
                            </button>
                            <button
                                type="button"
                                className="drvBtnGhost"
                                onClick={() => setViewingDoc(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                defaultCategory={selectedCategory || "General"}
                onUploadSuccess={() => {
                    setViewMode("ALL");
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
