"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, PenTool, CheckCircle2, AlertCircle } from "lucide-react";
import type { DocumentRecord } from "@/lib/api-types";

type Props = {
    document: DocumentRecord;
    onClose: () => void;
    canSign: boolean;
    isSigned: boolean;
    hasRead: boolean;
    onReadComplete: () => void;
    onSign: () => void;
};

export default function DocumentViewerModal({
    document: doc,
    onClose,
    canSign,
    isSigned,
    hasRead: hasReadProp,
    onReadComplete,
    onSign,
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasRead, setHasRead] = useState(hasReadProp);
    const [pages, setPages] = useState<string[]>([]);
    const [markingRead, setMarkingRead] = useState(false);

    const streamUrl = `/api/documents/${doc.id}/stream`;

    const checkScrollEnd = useCallback(() => {
        const el = scrollRef.current;
        if (!el || hasRead) return;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 48;
        if (atBottom) {
            setMarkingRead(true);
            fetch(`/api/documents/${doc.id}/read`, { method: "POST" })
                .then((res) => res.ok && res.json())
                .then(() => {
                    setHasRead(true);
                    onReadComplete();
                })
                .catch(() => setError("Could not save read progress. Scroll to the bottom again."))
                .finally(() => setMarkingRead(false));
        }
    }, [doc.id, hasRead, onReadComplete]);

    useEffect(() => {
        setHasRead(hasReadProp);
    }, [hasReadProp, doc.id]);

    useEffect(() => {
        let cancelled = false;

        async function loadPdf() {
            setLoading(true);
            setError(null);
            setPages([]);

            try {
                const pdfjs = await import("pdfjs-dist");
                pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

                const pdf = await pdfjs.getDocument(streamUrl).promise;
                const rendered: string[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    if (cancelled) return;
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.35 });
                    const canvas = window.document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (!ctx) continue;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    rendered.push(canvas.toDataURL("image/png"));
                }

                if (!cancelled) setPages(rendered);
            } catch {
                if (!cancelled) {
                    setError("Could not load PDF. Check that the file is a valid PDF.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPdf();
        return () => {
            cancelled = true;
        };
    }, [streamUrl, doc.id]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", checkScrollEnd, { passive: true });
        return () => el.removeEventListener("scroll", checkScrollEnd);
    }, [checkScrollEnd, pages.length]);

    useEffect(() => {
        if (!loading && pages.length > 0 && !hasRead) {
            const t = setTimeout(() => checkScrollEnd(), 300);
            return () => clearTimeout(t);
        }
    }, [loading, pages.length, hasRead, checkScrollEnd]);

    const showSignButton = canSign && !isSigned && hasRead;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0,0,0,0.88)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                padding: "1.5rem",
                backdropFilter: "blur(8px)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "1rem",
                    color: "white",
                    gap: "1rem",
                }}
            >
                <div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 600 }}>{doc.title}</h2>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.65)", marginTop: "0.35rem" }}>
                        {doc.description || "Company policy document"}
                    </p>
                    {!hasRead && canSign && !isSigned && (
                        <p
                            style={{
                                fontSize: "0.85rem",
                                color: "#fbbf24",
                                marginTop: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                            }}
                        >
                            <AlertCircle size={16} />
                            Scroll through the entire document to unlock Sign Now.
                        </p>
                    )}
                    {hasRead && canSign && !isSigned && (
                        <p
                            style={{
                                fontSize: "0.85rem",
                                color: "#34d399",
                                marginTop: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                            }}
                        >
                            <CheckCircle2 size={16} />
                            You have finished reading. You may sign now.
                        </p>
                    )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {showSignButton && (
                        <button
                            type="button"
                            onClick={onSign}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                background: "#ff9500",
                                color: "white",
                                border: "none",
                                padding: "0.6rem 1rem",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: 600,
                            }}
                        >
                            <PenTool size={16} />
                            Sign Now
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "none",
                            color: "white",
                            padding: "0.5rem",
                            borderRadius: "50%",
                            cursor: "pointer",
                        }}
                        aria-label="Close"
                    >
                        <X size={22} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    background: "#1e293b",
                    borderRadius: "12px",
                    overflow: "auto",
                    position: "relative",
                }}
            >
                {loading && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            color: "white",
                        }}
                    >
                        <Loader2 className="animate-spin" size={36} />
                    </div>
                )}
                {error && (
                    <p style={{ color: "#f87171", textAlign: "center", padding: "2rem" }}>{error}</p>
                )}
                {!loading &&
                    pages.map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt={`Page ${i + 1}`}
                            style={{ display: "block", width: "100%", maxWidth: "900px", margin: "0 auto 8px" }}
                        />
                    ))}
                {markingRead && (
                    <p style={{ textAlign: "center", color: "#94a3b8", padding: "1rem", fontSize: "0.85rem" }}>
                        Saving read progress…
                    </p>
                )}
            </div>
        </div>
    );
}
