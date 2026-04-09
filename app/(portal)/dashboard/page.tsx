"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Clock,
    MapPin,
    CheckCircle2,
    TrendingUp,
    AlertTriangle,
    LogIn,
    Coffee,
    Calendar,
    CalendarCheck,
    Users,
    LogOut,
    Loader2
} from "lucide-react";
import "@/styles/dashboard.css";

export default function DashboardPage() {
    const { data: session } = useSession();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [adminSummary, setAdminSummary] = useState<any>(null);
    const [rejectedTimesheets, setRejectedTimesheets] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole === "FOUNDER" || userRole === "HR_ADMIN";
    const canCheckIn = !isAdmin; // ALL non-admin roles can check in: MANAGER, TEAM_LEAD, EMPLOYEE, INTERN, CONTRACTOR

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (session?.user) {
            fetchData();
        }
    }, [session]);

    const fetchData = async () => {
        setIsLoadingLogs(true);
        try {
            if (isAdmin) {
                // Admins don't check in; they get a company-wide operational summary
                const sumRes = await fetch("/api/reports/summary");
                if (sumRes.ok) setAdminSummary(await sumRes.json());
            } else {
                // ALL non-admin employees get their personal attendance logs and stats
                const [logsRes, statsRes, timesheetsRes] = await Promise.all([
                    fetch("/api/attendance"),
                    fetch("/api/stats/summary"),
                    fetch("/api/timesheets")
                ]);

                let parsedLogs: any[] = [];
                if (logsRes.ok) {
                    parsedLogs = await logsRes.json();
                    setLogs(parsedLogs);
                }
                if (statsRes.ok) setStats(await statsRes.json());
                if (timesheetsRes.ok) {
                    const tData = await timesheetsRes.json();
                    setRejectedTimesheets(tData.filter((t: any) => t.status === "REJECTED"));
                }

                // Auto-detect check-in status from logs
                const today = new Date().toDateString();
                const todayLog = parsedLogs.find((l: any) => new Date(l.checkIn).toDateString() === today);
                if (todayLog && !todayLog.checkOut) {
                    setIsCheckedIn(true);
                    setCheckInTime(new Date(todayLog.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data");
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleCheckIn = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch("/api/attendance/check-in", { method: "POST" });
            if (res.ok) {
                setIsCheckedIn(true);
                setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                fetchData();
            }
        } catch (error) {
            console.error("Check-in failed");
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleCheckOut = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch("/api/attendance/check-out", { method: "POST" });
            if (res.ok) {
                setIsCheckedIn(false);
                setCheckInTime(null);
                fetchAttendance();
            }
        } catch (error) {
            console.error("Check-out failed");
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const fetchAttendance = async () => {
        // Redirection to main fetchData to solve lint without changing too many refs
        return fetchData();
    };

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Welcome back, <span className="text-gradient">{session?.user?.name}</span></h1>
                    <p>{currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • Office: Bangalore (HQ)</p>
                </div>
                {canCheckIn && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={24} color="var(--nuriek-blue)" />
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: isCheckedIn ? "#34c759" : "rgba(255,255,255,0.3)", display: "inline-block", boxShadow: isCheckedIn ? "0 0 8px #34c759" : "none" }} />
                            <span style={{ fontSize: "0.78rem", color: isCheckedIn ? "#34c759" : "var(--text-tertiary)", fontWeight: 500 }}>
                                {isCheckedIn ? `Checked in at ${checkInTime}` : "Not checked in today"}
                            </span>
                        </div>
                    </div>
                )}
                {isAdmin && (
                    <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={24} color="var(--nuriek-blue)" />
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Real-time Organizational Overview
                        </div>
                    </div>
                )}
            </header>

            {!isAdmin && rejectedTimesheets.length > 0 && (
                <div style={{ background: 'rgba(255, 59, 48, 0.15)', borderLeft: '4px solid #ff3b30', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <AlertTriangle color="#ff3b30" size={24} style={{ marginTop: '0.2rem', minWidth: '24px' }} />
                    <div>
                        <h3 style={{ color: '#ff3b30', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Compliance Issue</h3>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                            You have {rejectedTimesheets.length} rejected timesheet{rejectedTimesheets.length > 1 ? 's' : ''}. Please review your submissions in the Time Management tab.
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {rejectedTimesheets.slice(0, 3).map((t: any) => (
                                <li key={t.id} style={{ marginBottom: '0.2rem' }}>Timesheet for {new Date(t.date).toLocaleDateString()} was rejected.</li>
                            ))}
                            {rejectedTimesheets.length > 3 && <li>...and {rejectedTimesheets.length - 3} more.</li>}
                        </ul>
                    </div>
                </div>
            )}

            <div className={canCheckIn ? "grid" : ""}>
                {isAdmin ? (
                    <div className="summaryGrid" style={{ marginTop: '2rem' }}>
                        <div className="card reportCard glass" style={{ borderLeft: '4px solid var(--nuriek-blue)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)' }}>
                            <div className="cardTop">
                                <span>Total Workforce</span>
                                <Users size={24} color="var(--nuriek-blue)" />
                            </div>
                            <div className="cardValue" style={{ fontSize: '2.5rem', color: 'white' }}>{adminSummary?.totalEmployees || 0}</div>
                            <div className="cardLabel" style={{ color: 'rgba(255,255,255,0.6)' }}>Active Employees</div>
                        </div>

                        <div className="card reportCard glass" style={{ borderLeft: '4px solid #34c759', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)' }}>
                            <div className="cardTop">
                                <span>Present Today</span>
                                <Clock size={24} color="#34c759" />
                            </div>
                            <div className="cardValue" style={{ fontSize: '2.5rem', color: '#34c759' }}>{adminSummary?.checkedInToday || 0}</div>
                            <div className="cardLabel" style={{ color: 'rgba(255,255,255,0.6)' }}>{adminSummary?.attendanceRate?.toFixed(1) || 0}% Attendance Rate</div>
                        </div>

                        <div className="card reportCard glass" style={{ borderLeft: '4px solid #ff9f0a', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)' }}>
                            <div className="cardTop">
                                <span>On Leave</span>
                                <Calendar size={24} color="#ff9f0a" />
                            </div>
                            <div className="cardValue" style={{ fontSize: '2.5rem', color: '#ff9f0a' }}>{adminSummary?.onLeaveToday || 0}</div>
                            <div className="cardLabel" style={{ color: 'rgba(255,255,255,0.6)' }}>Approved Leaves Today</div>
                        </div>

                        <div className="card reportCard glass" style={{ borderLeft: '4px solid #ff3b30', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)' }}>
                            <div className="cardTop">
                                <span>Pending Requests</span>
                                <CalendarCheck size={24} color="#ff3b30" />
                            </div>
                            <div className="cardValue" style={{ fontSize: '2.5rem', color: '#ff3b30' }}>{adminSummary?.pendingLeaves || 0}</div>
                            <div className="cardLabel" style={{ color: 'rgba(255,255,255,0.6)' }}>Awaiting Action</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <section className="card amsActionCard glass">
                            <div className="cardHeader">
                                <span className="cardTitle">Attendance Control</span>
                                <Clock className="cardIcon" size={20} />
                            </div>

                            <div className="timeDisplay">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </div>

                            <div className="checkInActions">
                                {!isCheckedIn ? (
                                    <button className="actionBtn checkInBtn" onClick={handleCheckIn}>
                                        <LogIn size={20} />
                                        <span>Check In</span>
                                    </button>
                                ) : (
                                    <>
                                        <button className="actionBtn breakBtn">
                                            <Coffee size={18} />
                                            <span>Take Break</span>
                                        </button>
                                        <button className="actionBtn checkOutBtn" onClick={handleCheckOut}>
                                            <LogOut size={18} />
                                            <span>Check Out</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="recentLogs">
                                <p className="statLabel">Latest Database Logs</p>
                                {isLoadingLogs ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                                        <Loader2 className="animate-spin" size={20} />
                                    </div>
                                ) : logs.length > 0 ? (
                                    logs.map((log: any) => (
                                        <div key={log.id} className="logItem">
                                            <div className="logInfo">
                                                <span className="logTitle">{new Date(log.checkIn).toLocaleDateString()}</span>
                                                <span className="logTime">
                                                    {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {log.checkOut ? ` — ${new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Active)'}
                                                </span>
                                            </div>
                                            <span className={`logStatus ${log.status === 'ON_TIME' ? 'statusOnTime' : 'statusLate'}`}>
                                                {log.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="subtitle" style={{ textAlign: 'center', fontSize: '0.85rem' }}>No logs found in database.</p>
                                )}
                            </div>
                        </section>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <section className="card glass">
                                <div className="cardHeader">
                                    <span className="cardTitle">Monthly Summary</span>
                                    <Calendar className="cardIcon" size={20} />
                                </div>
                                <div className="statsGrid">
                                    <div className="statItem">
                                        <span className="statLabel">Present Days</span>
                                        <span className="statValue">{stats?.presentDays || 0} / 22</span>
                                    </div>
                                    <div className="statItem">
                                        <span className="statLabel">Late Marks</span>
                                        <span className="statValue">{stats?.lateMarks || 0}</span>
                                        <span className="statTrend" style={{ color: (stats?.lateMarks || 0) === 0 ? '#34c759' : '#ff9f0a' }}>
                                            {(stats?.lateMarks || 0) === 0 ? <><CheckCircle2 size={12} /> Excellent</> : <><AlertTriangle size={12} /> Needs Improvement</>}
                                        </span>
                                    </div>
                                </div>
                            </section>
                            <section className="card glass">
                                <div className="cardHeader">
                                    <span className="cardTitle">Discipline Score</span>
                                    <TrendingUp className="cardIcon" size={20} />
                                </div>
                                <div className="statItem">
                                    <span className="statValue text-gradient">{stats?.disciplineScore || 100} / 100</span>
                                    <p className="statLabel">
                                        {(stats?.disciplineScore || 100) === 100 ? "Perfect record based on DB sync. Keep it up!" : "Score affected by late arrivals."}
                                    </p>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
