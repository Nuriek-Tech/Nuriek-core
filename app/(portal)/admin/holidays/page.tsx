"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Upload,
    Loader2,
    Trash2,
    Calendar,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { HolidayRecord } from "@/lib/api-types";
import "@/styles/people-hub.css";
import "@/styles/reports.css";
import "../../admin/documents/admin-documents.css";

const SAMPLE_CSV = `name,date,type
Republic Day,2026-01-26,PUBLIC
Holi,2026-03-14,OPTIONAL
Independence Day,2026-08-15,PUBLIC
Diwali,2026-11-08,PUBLIC`;

export default function AdminHolidaysPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [csv, setCsv] = useState("");
    const [replaceYear, setReplaceYear] = useState(String(new Date().getFullYear()));
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const isSuperAdmin = session?.user?.role === "FOUNDER";

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/holidays");
            if (res.ok) {
                setHolidays(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") return;
        if (status === "authenticated" && !isSuperAdmin) {
            router.replace("/dashboard");
            return;
        }
        if (isSuperAdmin) fetchHolidays();
    }, [status, isSuperAdmin, router, fetchHolidays]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setMessage("");
        setError("");
        try {
            const res = await fetch("/api/admin/holidays/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    csv,
                    replaceYear: replaceYear ? Number(replaceYear) : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Upload failed");
                if (data.details?.length) {
                    setError((prev) => `${prev}\n${data.details.join("\n")}`);
                }
            } else {
                setMessage(
                    `Published ${data.published} holiday(s) for ${(data.years as number[])?.join(", ") || replaceYear}. All employees can see them on the Leave calendar.`
                );
                setCsv("");
                fetchHolidays();
            }
        } catch {
            setError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this holiday from the published calendar?")) return;
        const res = await fetch("/api/holidays", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (res.ok) fetchHolidays();
        else alert("Could not delete holiday");
    };

    if (status === "loading" || !isSuperAdmin) {
        return (
            <div className="repLoading" style={{ minHeight: "40vh" }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    const yearFilter = replaceYear ? Number(replaceYear) : null;
    const listed = holidays.filter((h) =>
        yearFilter ? new Date(h.date).getFullYear() === yearFilter : true
    );

    return (
        <div className="hubPage repHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <Link href="/settings" className="admBackLink" aria-label="Back to settings">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">Super Admin</p>
                    <h1>
                        Holiday <span className="text-gradient">calendar</span>
                    </h1>
                    <p className="hubSubtitle">
                        Upload the annual holiday list (CSV). Entries are published immediately for
                        everyone on the Leave &amp; Holidays page.
                    </p>
                </div>
            </header>

            <section className="repPanel glass" style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Upload &amp; publish</h2>
                <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {error && (
                        <div className="loginError" role="alert" style={{ whiteSpace: "pre-wrap" }}>
                            <AlertCircle size={17} />
                            <span>{error}</span>
                        </div>
                    )}
                    {message && (
                        <div className="loginSuccess" role="status">
                            <CheckCircle2 size={17} />
                            <span>{message}</span>
                        </div>
                    )}
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">Replace holidays for year</label>
                        <input
                            type="number"
                            className="repFilterInput"
                            min={2020}
                            max={2100}
                            value={replaceYear}
                            onChange={(e) => setReplaceYear(e.target.value)}
                            style={{ maxWidth: "8rem" }}
                        />
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            Existing holidays in this year are removed, then the list below is
                            published.
                        </span>
                    </div>
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">CSV list (name, date, type)</label>
                        <textarea
                            className="repFilterInput"
                            rows={10}
                            placeholder={SAMPLE_CSV}
                            value={csv}
                            onChange={(e) => setCsv(e.target.value)}
                            required
                            style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "0.85rem" }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="repExportBtn repExportBtn--ghost"
                            onClick={() => setCsv(SAMPLE_CSV)}
                        >
                            Load sample format
                        </button>
                        <button
                            type="submit"
                            className="repExportBtn repExportBtn--primary"
                            disabled={uploading || !csv.trim()}
                        >
                            {uploading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Upload size={18} />
                            )}
                            Publish to all employees
                        </button>
                    </div>
                </form>
            </section>

            <section className="repPanel glass">
                <div className="repMiniStats">
                    <span className="repMiniStat">
                        Published<strong>{listed.length}</strong>
                    </span>
                    <span className="repMiniStat">
                        Year<strong>{replaceYear || "All"}</strong>
                    </span>
                </div>
                {loading ? (
                    <div className="repLoading">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <div className="repTableWrap">
                        <table className="repDataTable">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {listed.length > 0 ? (
                                    listed.map((h) => (
                                        <tr key={h.id}>
                                            <td>
                                                {new Date(h.date).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </td>
                                            <td>{h.name}</td>
                                            <td>{h.type}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="repViewBtn"
                                                    onClick={() => handleDelete(h.id)}
                                                    aria-label="Delete holiday"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="repEmptyRow">
                                            No holidays for this year. Upload a list above.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <Calendar size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Employees see published holidays on{" "}
                    <Link href="/leave" style={{ color: "var(--nuriek-blue)" }}>
                        Leave &amp; Holidays
                    </Link>
                    .
                </p>
            </section>
        </div>
    );
}
