"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
    Clock,
    Calendar,
    Filter,
    CheckCircle2,
    Plus,
    History,
    FileText,
    Loader2,
    ListChecks,
    Shield
} from "lucide-react";
import "@/styles/dashboard.css";
import { PREDEFINED_TASKS } from "@/lib/constants";
import type { AttendanceLog, StatsSummary, TimesheetRecord } from "@/lib/api-types";

type OrgTask = { id: string; title: string };

export default function AttendancePage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'attendance' | 'timesheet'>('attendance');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tasks, setTasks] = useState("");
    const [hours, setHours] = useState("8");
    const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [orgTasks, setOrgTasks] = useState<OrgTask[]>([]);
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Org Task Form (For Admins)
    const [orgTaskTitle, setOrgTaskTitle] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);
    const [mountDate, setMountDate] = useState("");

    const fetchOrgTasks = useCallback(async () => {
        try {
            const res = await fetch("/api/org-tasks");
            if (res.ok) {
                setOrgTasks(await res.json());
            }
        } catch {
            console.error("Failed to fetch org tasks");
        }
    }, []);

    const fetchTimesheets = useCallback(async () => {
        try {
            const res = await fetch("/api/timesheets");
            if (res.ok) {
                const data = await res.json();
                setTimesheets(data);
            }
        } catch {
            console.error("Failed to fetch timesheets");
        }
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'attendance') {
                const [lRes, sRes] = await Promise.all([
                    fetch("/api/attendance"),
                    fetch("/api/stats/summary")
                ]);
                if (lRes.ok) setLogs(await lRes.json());
                if (sRes.ok) setStats(await sRes.json());
            } else {
                fetchTimesheets();
                fetchOrgTasks();
            }
        } catch {
            console.error("Failed to fetch attendance data");
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, fetchTimesheets, fetchOrgTasks]);

    useEffect(() => {
        setMountDate(new Date().toLocaleDateString('en-GB'));
        fetchData();
    }, [fetchData]);

    const handleTimesheetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/timesheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tasks, hours })
            });
            if (res.ok) {
                setTasks("");
                setHours("8");
                fetchTimesheets();
                alert("Timesheet submitted successfully!");
            }
        } catch {
            alert("Failed to submit timesheet");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePublishOrgTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPublishing(true);
        try {
            const res = await fetch("/api/org-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: orgTaskTitle })
            });
            if (res.ok) {
                setOrgTaskTitle("");
                fetchOrgTasks();
                alert("Organization task published successfully!");
            } else {
                alert("Failed to publish task (Unauthorized or Error)");
            }
        } catch {
            alert("Failed to publish task");
        } finally {
            setIsPublishing(false);
        }
    };

    const userRole = session?.user?.role;
    const isAdmin = userRole === "HR_ADMIN" || userRole === "FOUNDER";

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1><span className="text-gradient">Time Management</span></h1>
                    <p>Track your time-off, attendance, and log daily project contributions</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        className={`checkInButton ${activeTab === 'attendance' ? '' : 'ghost'}`}
                        style={activeTab === 'attendance' ? {} : { background: 'transparent', boxShadow: 'none', color: 'rgba(255,255,255,0.6)' }}
                        onClick={() => setActiveTab('attendance')}
                    >
                        <span>Attendance Logs</span>
                    </button>
                    <button
                        className={`checkInButton ${activeTab === 'timesheet' ? '' : 'ghost'}`}
                        style={activeTab === 'timesheet' ? {} : { background: 'transparent', boxShadow: 'none', color: 'rgba(255,255,255,0.6)' }}
                        onClick={() => setActiveTab('timesheet')}
                    >
                        <span>Daily Timesheet</span>
                    </button>
                </div>
            </header>

            {activeTab === 'attendance' ? (
                <>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                        <section className="card glass">
                            <div className="cardHeader">
                                <span className="cardTitle">Monthly Stats</span>
                                <Calendar size={20} className="cardIcon" />
                            </div>
                            <div className="statsGrid">
                                <div className="statItem">
                                    <span className="statLabel">Total Days</span>
                                    <span className="statValue">{stats?.totalDays || logs.length || 0}</span>
                                </div>
                                <div className="statItem">
                                    <span className="statLabel">Present Days</span>
                                    <span className="statValue" style={{ color: '#34c759' }}>{stats?.presentDays || 0}</span>
                                </div>
                                <div className="statItem">
                                    <span className="statLabel">Late Marks</span>
                                    <span className="statValue" style={{ color: '#ff9f0a' }}>{stats?.lateMarks || 0}</span>
                                </div>
                                <div className="statItem">
                                    <span className="statLabel">Leave days (this month)</span>
                                    <span className="statValue" style={{ color: 'var(--nuriek-blue)' }}>{stats?.leaveDaysThisMonth ?? 0}</span>
                                </div>
                            </div>
                        </section>

                        <section className="card glass">
                            <div className="cardHeader">
                                <span className="cardTitle">This Month</span>
                                <Calendar size={20} className="cardIcon" />
                            </div>
                            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </p>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                                    {logs.length > 0 ? `${logs.length} sessions logged` : 'No sessions logged yet'}
                                </p>
                            </div>
                        </section>
                    </div>

                    <section className="card glass" style={{ marginTop: '2rem' }}>
                        <div className="cardHeader">
                            <span className="cardTitle">Attendance History</span>
                            <Filter size={20} className="cardIcon" />
                        </div>
                        <div className="recentLogs">
                            {isLoading ? (
                                <div style={{ padding: '3rem', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            ) : logs.length > 0 ? logs.map(log => (
                                <div key={log.id} className="logItem">
                                    <div className="logInfo">
                                        <span className="logTitle">{new Date(log.checkIn).toLocaleDateString()}</span>
                                        <span className="logTime">
                                            {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {log.checkOut ? ` — ${new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Active)'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <span className={`logStatus ${log.status === 'ON_TIME' ? 'statusOnTime' : log.status === 'LATE' ? 'statusLate' : ''}`}
                                                style={log.status === 'ABSENT' ? { background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a' } : {}}>
                                                {log.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No attendance logs found.</p>
                            )}
                        </div>
                    </section>
                </>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                    <section className="card glass">
                        <div className="cardHeader">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="cardIcon" style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(var(--nuriek-blue-rgb), 0.1)', color: 'var(--nuriek-blue)' }}>
                                    <Plus size={20} />
                                </div>
                                <span className="cardTitle">Daily Log Submission</span>
                            </div>
                        </div>
                        <form onSubmit={handleTimesheetSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="inputGroup">
                                <label className="statLabel">Date</label>
                                <div className="inputWrapper">
                                    <Calendar className="inputIcon" size={18} />
                                    <input type="text" readOnly className="input" style={{ opacity: 0.6 }} value={mountDate} />
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label className="statLabel">Predefined Tasks</label>
                                <div className="inputWrapper">
                                    <ListChecks className="inputIcon" size={18} />
                                    <select
                                        className="input"
                                        style={{ appearance: 'none' }}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setTasks(prev => prev ? `${prev}\n- ${e.target.value}` : `- ${e.target.value}`);
                                                e.target.value = ""; // Reset dropdown
                                            }
                                        }}
                                    >
                                        <option value="">-- Select a common task --</option>
                                        
                                        {orgTasks.length > 0 && <optgroup label="Organization Published Tasks" style={{ color: 'var(--text-secondary)' }}>
                                            {orgTasks.map(task => (
                                                <option key={task.id} value={task.title} style={{ color: 'var(--text-primary)' }}>⭐ {task.title}</option>
                                            ))}
                                        </optgroup>}

                                        <optgroup label="Predefined Tasks" style={{ color: 'var(--text-secondary)' }}>
                                            {PREDEFINED_TASKS.map(task => (
                                                <option key={task} value={task} style={{ color: 'var(--text-primary)' }}>{task}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label className="statLabel">Tasks Accomplished</label>
                                <div className="inputWrapper" style={{ alignItems: 'flex-start', padding: '0.75rem' }}>
                                    <FileText className="inputIcon" size={18} style={{ marginTop: '0.2rem' }} />
                                    <textarea
                                        required
                                        className="input"
                                        placeholder="What did you work on today? (Selected tasks will appear here)"
                                        rows={6}
                                        style={{ background: 'transparent', border: 'none', resize: 'none', width: '100%', outline: 'none' }}
                                        value={tasks}
                                        onChange={(e) => setTasks(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="inputGroup">
                                    <label className="statLabel">Hours Worked</label>
                                    <div className="inputWrapper">
                                        <Clock className="inputIcon" size={18} />
                                        <input
                                            required
                                            type="number"
                                            className="input"
                                            min="0" max="24" step="0.5"
                                            value={hours}
                                            onChange={(e) => setHours(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="inputGroup">
                                    <label className="statLabel">Current Status</label>
                                    <div className="inputWrapper">
                                        <CheckCircle2 className="inputIcon" size={18} color="#34c759" />
                                        <input type="text" readOnly className="input" style={{ color: '#34c759', fontWeight: 600 }} value="Submitting" />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={isSubmitting} className="checkInButton" style={{ width: '100%', marginTop: '1rem', height: '3.5rem' }}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Submit Today&apos;s Timesheet</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    <section className="card glass">
                        <div className="cardHeader">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="cardIcon" style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 159, 10, 0.1)', color: '#ff9f0a' }}>
                                    <History size={20} />
                                </div>
                                <span className="cardTitle">Recent History</span>
                            </div>
                        </div>
                        <div className="recentLogs" style={{ marginTop: '1rem' }}>
                            {timesheets.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)' }}>
                                    <Clock size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                    <p>No timesheets logged yet.</p>
                                </div>
                            ) : (
                                timesheets.map((ts) => (
                                    <div key={ts.id} className="logItem" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.8rem' }}>
                                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="logTitle">{new Date(ts.date).toLocaleDateString('en-GB')}</span>
                                            <span className="logStatus statusOnTime">{ts.hours} Hours</span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)', width: '100%' }}>
                                            {ts.tasks}
                                        </p>
                                    </div>
                                ))
                            )}
                         </div>
                    </section>

                    {isAdmin && (
                        <section className="card glass amsActionCard" style={{ gridColumn: '1 / -1', marginTop: '1rem', border: '1px solid rgba(10, 132, 255, 0.3)' }}>
                            <div className="cardHeader">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="cardIcon" style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(10, 132, 255, 0.1)', color: '#0a84ff' }}>
                                        <Shield size={20} />
                                    </div>
                                    <span className="cardTitle">Publish Organization Task (Admin Only)</span>
                                </div>
                            </div>
                            <form onSubmit={handlePublishOrgTask} style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                <div className="inputGroup" style={{ flex: 1 }}>
                                    <label className="statLabel">Task Title</label>
                                    <div className="inputWrapper">
                                        <FileText className="inputIcon" size={18} />
                                        <input
                                            required
                                            type="text"
                                            className="input"
                                            placeholder="e.g. Mandatory Information Security Training Q3"
                                            value={orgTaskTitle}
                                            onChange={(e) => setOrgTaskTitle(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={isPublishing} className="checkInButton" style={{ height: '3.5rem', padding: '0 2rem' }}>
                                    {isPublishing ? <Loader2 className="animate-spin" size={20} /> : (
                                        <>
                                            <Plus size={18} />
                                            <span>Publish Task Globally</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

