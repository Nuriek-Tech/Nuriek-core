"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, LogIn, Users } from "lucide-react";
import { formatRoleLabel } from "@/lib/roles";
import { isAdminRole } from "@/lib/constants";
import type { Role } from "@/lib/constants";
import "@/styles/people-hub.css";
import "@/styles/reports.css";
import "../../admin/documents/admin-documents.css";

type LoginSessionRow = {
    id: string;
    user: { name: string | null; email: string | null; role: string };
    loginAt: string;
    lastActivityAt: string;
    logoutAt: string | null;
    endReason: string | null;
    isActive: boolean;
    durationLabel: string;
};

function formatWhen(iso: string): string {
    return new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function endReasonLabel(reason: string | null, isActive: boolean): string {
    if (isActive) return "Active now";
    if (reason === "inactivity") return "Auto sign-out (15 min idle)";
    if (reason === "new_login") return "New login elsewhere";
    if (reason === "logout") return "Signed out";
    return "Ended";
}

export default function AdminLoginSessionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [rows, setRows] = useState<LoginSessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    const canView = isAdminRole(session?.user?.role as Role | undefined);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/login-sessions?days=${days}`);
            if (res.ok) {
                const data = await res.json();
                setRows(data.sessions ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        if (status === "unauthenticated") return;
        if (status === "authenticated" && !canView) {
            router.replace("/dashboard");
            return;
        }
        if (canView) fetchSessions();
    }, [status, canView, router, fetchSessions]);

    const activeCount = rows.filter((r) => r.isActive).length;

    if (status === "loading" || !canView) {
        return (
            <div className="repLoading" style={{ minHeight: "40vh" }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="hubPage repHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <Link href="/reports" className="admBackLink" aria-label="Back to reports">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">Admin</p>
                    <h1>
                        Login <span className="text-gradient">activity</span>
                    </h1>
                </div>
                <div className="hubHeroActions">
                    <span className="hubStatChip">
                        <Users size={16} color="var(--nuriek-blue)" />
                        <strong>{activeCount}</strong> online now
                    </span>
                </div>
            </header>

            <section className="repPanel glass">
                <div className="repToolbar">
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">Show last</label>
                        <select
                            className="repFilterSelect"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                        >
                            <option value={7}>7 days</option>
                            <option value={30}>30 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        className="repExportBtn repExportBtn--ghost"
                        onClick={fetchSessions}
                        disabled={loading}
                    >
                        Refresh
                    </button>
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
                                    <th>Employee</th>
                                    <th>Role</th>
                                    <th>Signed in</th>
                                    <th>Last active</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length > 0 ? (
                                    rows.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <div className="repCellName">
                                                    {row.user.name || "—"}
                                                </div>
                                                <div className="repCellEmail">
                                                    {row.user.email}
                                                </div>
                                            </td>
                                            <td>{formatRoleLabel(row.user.role)}</td>
                                            <td>{formatWhen(row.loginAt)}</td>
                                            <td>{formatWhen(row.lastActivityAt)}</td>
                                            <td>
                                                <strong>{row.durationLabel}</strong>
                                            </td>
                                            <td>
                                                <span
                                                    className={`repStatusBadge ${
                                                        row.isActive
                                                            ? "repStatusBadge--approved"
                                                            : "repStatusBadge--pending"
                                                    }`}
                                                >
                                                    {endReasonLabel(row.endReason, row.isActive)}
                                                </span>
                                                {row.logoutAt && (
                                                    <div
                                                        style={{
                                                            fontSize: "0.72rem",
                                                            color: "var(--text-secondary)",
                                                            marginTop: "0.25rem",
                                                        }}
                                                    >
                                                        Ended {formatWhen(row.logoutAt)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="repEmptyRow">
                                            No login sessions in this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <p
                    style={{
                        marginTop: "1rem",
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                    }}
                >
                    <LogIn size={14} />
                    Duration is from sign-in to last activity or sign-out.
                </p>
            </section>
        </div>
    );
}
