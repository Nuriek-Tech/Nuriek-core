"use client";

import { useState, useEffect } from "react";
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    Calendar,
    Loader2,
    FileText
} from "lucide-react";
import "@/styles/dashboard.css";
import type { TimesheetRecord } from "@/lib/api-types";

type AdminTimesheetRecord = TimesheetRecord & {
    user?: { name?: string | null; email?: string | null };
};

export default function AdminTimesheetsPage() {
    const [timesheets, setTimesheets] = useState<AdminTimesheetRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTimesheets();
    }, []);

    const fetchTimesheets = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/timesheets");
            if (res.ok) {
                setTimesheets(await res.json());
            }
        } catch {
            console.error("Failed to fetch timesheets");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
        try {
            const res = await fetch(`/api/admin/timesheets/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                setTimesheets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
            } else {
                alert("Failed to update status");
            }
        } catch {
            alert("Error updating status");
        }
    };

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Admin <span className="text-gradient">Timesheet Approvals</span></h1>
                    <p>Review and manage daily timesheet submissions from all employees.</p>
                </div>
            </header>

            <div className="card glass">
                <h2 className="cardTitle" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} color="var(--nuriek-blue)" />
                    Pending & Recent Submissions
                </h2>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Employee</th>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Hours</th>
                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Tasks Logged</th>
                            <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Status / Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                                    <Loader2 className="animate-spin" size={32} color="var(--nuriek-blue)" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : timesheets.length > 0 ? (
                            timesheets.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{t.user?.name || "Unknown"}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.user?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} />
                                            {new Date(t.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: t.hours >= 7 ? '#34c759' : '#ff9f0a' }}>
                                            <Clock size={14} />
                                            {t.hours} hrs
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', maxWidth: '300px' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                                            {t.tasks}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        {t.status === "SUBMITTED" ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleAction(t.id, "APPROVED")}
                                                    style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid #34c759', color: '#34c759', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                                                >
                                                    <CheckCircle size={14} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(t.id, "REJECTED")}
                                                    style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid #ff3b30', color: '#ff3b30', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: t.status === "APPROVED" ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                                                color: t.status === "APPROVED" ? '#34c759' : '#ff3b30'
                                            }}>
                                                {t.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                    No timesheets found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
