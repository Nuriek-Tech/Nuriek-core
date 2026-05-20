"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { AdminSummary, AttendanceLog, StatsSummary, TimesheetRecord } from "@/lib/api-types";
import { NAV_ITEMS, ROLES, isAdminRole, type Role } from "@/lib/constants";
import { formatRoleLabel } from "@/lib/roles";
import { useNavRole } from "@/hooks/useNavRole";
import { NavIcon } from "@/lib/nav-icons";
import {
    Clock,
    CheckCircle2,
    TrendingUp,
    AlertTriangle,
    LogIn,
    Coffee,
    Calendar,
    CalendarCheck,
    Users,
    LogOut,
    Loader2,
    ArrowRight,
    MapPin,
    FileCheck,
    BarChart3,
} from "lucide-react";
import LiveClock from "@/components/LiveClock";
import "@/styles/dashboard.css";
import "@/styles/dashboard-home.css";

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
    const [rejectedTimesheets, setRejectedTimesheets] = useState<TimesheetRecord[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [isLoadingAdminSummary, setIsLoadingAdminSummary] = useState(true);
    const [onBreak, setOnBreak] = useState(false);
    const [officeName, setOfficeName] = useState("Bangalore (HQ)");

    const { role: userRole, isReady: roleReady } = useNavRole();
    const isAdmin = isAdminRole(userRole);
    const canCheckIn = !isAdmin;

    const quickLinks = useMemo(() => {
        if (!userRole) return [];
        return NAV_ITEMS.filter(
            (item) => item.path !== "/dashboard" && item.roles.includes(userRole)
        ).slice(0, 6);
    }, [userRole]);

    const disciplineScore = stats?.disciplineScore ?? 100;
    const ringOffset = 251.2 - (251.2 * disciplineScore) / 100;

    const fetchAdminSummary = useCallback(async () => {
        setIsLoadingAdminSummary(true);
        try {
            const sumRes = await fetch("/api/reports/summary", { cache: "no-store" });
            if (sumRes.ok) setAdminSummary(await sumRes.json());
        } catch {
            console.error("Failed to fetch org summary");
        } finally {
            setIsLoadingAdminSummary(false);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (isAdmin) return;

        setIsLoadingLogs(true);
        try {
                const [logsRes, statsRes, timesheetsRes] = await Promise.all([
                    fetch("/api/attendance"),
                    fetch("/api/stats/summary"),
                    fetch("/api/timesheets"),
                ]);

                let parsedLogs: AttendanceLog[] = [];
                if (logsRes.ok) {
                    parsedLogs = await logsRes.json();
                    setLogs(parsedLogs);
                }
                if (statsRes.ok) setStats(await statsRes.json());
                if (timesheetsRes.ok) {
                    const tData: TimesheetRecord[] = await timesheetsRes.json();
                    setRejectedTimesheets(tData.filter((t) => t.status === "REJECTED"));
                }

                const today = new Date().toDateString();
                const todayLog = parsedLogs.find(
                    (l) => new Date(l.checkIn).toDateString() === today
                );
                if (todayLog && !todayLog.checkOut) {
                    setIsCheckedIn(true);
                    setCheckInTime(
                        new Date(todayLog.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                    );
                    setOnBreak(Boolean(todayLog.breakStart && !todayLog.breakEnd));
                } else {
                    setOnBreak(false);
                }
        } catch {
            console.error("Failed to fetch dashboard data");
        } finally {
            setIsLoadingLogs(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!roleReady) return;

        if (isAdmin) {
            fetchAdminSummary();
            return;
        }

        if (!session?.user) return;

        fetchData();
        fetch("/api/config/public")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.officeName && setOfficeName(d.officeName))
            .catch(() => undefined);
    }, [roleReady, isAdmin, session?.user, fetchAdminSummary, fetchData]);

    const handleCheckIn = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch("/api/attendance/check-in", { method: "POST" });
            if (res.ok) {
                setIsCheckedIn(true);
                setCheckInTime(
                    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                );
                fetchData();
            }
        } catch {
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
                fetchData();
            }
        } catch {
            console.error("Check-out failed");
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleBreak = async (action: "break-start" | "break-end") => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch(`/api/attendance/${action}`, { method: "POST" });
            if (res.ok) {
                setOnBreak(action === "break-start");
                await fetchData();
            }
        } catch (error) {
            console.error("Break action failed", error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const dateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const recentLogs = logs.slice(0, 5);
    const attendanceRate = adminSummary?.attendanceRate ?? 0;
    const absentToday = adminSummary?.absentEstimate ?? 0;
    const monthDenominator = stats?.workingDaysElapsed ?? stats?.totalDays ?? 0;

    return (
        <div className="dashHome">
            <header className="dashHero">
                <div className="dashHeroMain">
                    <p className="dashEyebrow">{getGreeting()}</p>
                    <h1>
                        Welcome back,{" "}
                        <span className="text-gradient">{session?.user?.name ?? "there"}</span>
                    </h1>
                    <div className="dashMeta">
                        <span>{dateStr}</span>
                        <span className="dashMetaDot" aria-hidden />
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <MapPin size={14} />
                            {officeName}
                        </span>
                        <span className="dashMetaDot" aria-hidden />
                        <span className="dashRolePill">{formatRoleLabel(userRole)}</span>
                    </div>
                </div>

                <div className="dashClockCard glass">
                    <div className="dashClockTime">
                        <Clock size={22} color="var(--nuriek-blue)" aria-hidden />
                        <LiveClock variant="card" />
                    </div>
                    <p className="dashClockSub">
                        {isAdmin ? "Organizational overview" : "Your workday at a glance"}
                    </p>
                    {canCheckIn && (
                        <div className="dashStatusRow">
                            <span
                                className={`dashStatusDot ${isCheckedIn ? "dashStatusDot--on" : "dashStatusDot--off"}`}
                            />
                            <span
                                className={`dashStatusText ${isCheckedIn ? "dashStatusText--on" : "dashStatusText--off"}`}
                            >
                                {isCheckedIn
                                    ? `Checked in at ${checkInTime}`
                                    : "Not checked in today"}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {!isAdmin && rejectedTimesheets.length > 0 && (
                <div className="dashAlert" role="alert">
                    <AlertTriangle color="#ff3b30" size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <h3 className="dashAlertTitle">Action required</h3>
                        <p className="dashAlertBody">
                            You have {rejectedTimesheets.length} rejected timesheet
                            {rejectedTimesheets.length > 1 ? "s" : ""}. Please update them in Time
                            Management.
                        </p>
                        <ul className="dashAlertList">
                            {rejectedTimesheets.slice(0, 3).map((t) => (
                                <li key={t.id}>
                                    {new Date(t.date).toLocaleDateString()} — rejected
                                </li>
                            ))}
                            {rejectedTimesheets.length > 3 && (
                                <li>…and {rejectedTimesheets.length - 3} more</li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {isAdmin ? (
                <>
                    <section className="dashKpiGrid" aria-label="Organization metrics">
                        <article className="dashKpiCard glass glass-hover">
                            <div className="dashKpiTop">
                                <span className="dashKpiLabel">Total workforce</span>
                                <span className="dashKpiIcon dashKpiIcon--blue">
                                    <Users size={20} />
                                </span>
                            </div>
                            <div className="dashKpiValue dashKpiValue--blue">
                                {isLoadingAdminSummary && adminSummary == null ? (
                                    <Loader2 className="animate-spin" size={28} />
                                ) : (
                                    (adminSummary?.totalEmployees ?? "—")
                                )}
                            </div>
                            <span className="dashKpiHint">Employees (excl. interns & super admin/HR)</span>
                        </article>

                        <article className="dashKpiCard glass glass-hover">
                            <div className="dashKpiTop">
                                <span className="dashKpiLabel">Present today</span>
                                <span className="dashKpiIcon dashKpiIcon--green">
                                    <Clock size={20} />
                                </span>
                            </div>
                            <div className="dashKpiValue dashKpiValue--green">
                                {adminSummary?.checkedInToday ?? "—"}
                            </div>
                            <span className="dashKpiHint">
                                {attendanceRate.toFixed(1)}% of expected in office today
                            </span>
                        </article>

                        <article className="dashKpiCard glass glass-hover">
                            <div className="dashKpiTop">
                                <span className="dashKpiLabel">On leave</span>
                                <span className="dashKpiIcon dashKpiIcon--orange">
                                    <Calendar size={20} />
                                </span>
                            </div>
                            <div className="dashKpiValue dashKpiValue--orange">
                                {adminSummary?.onLeaveToday ?? "—"}
                            </div>
                            <span className="dashKpiHint">Approved leaves today</span>
                        </article>

                        <article className="dashKpiCard glass glass-hover">
                            <div className="dashKpiTop">
                                <span className="dashKpiLabel">Pending requests</span>
                                <span className="dashKpiIcon dashKpiIcon--red">
                                    <CalendarCheck size={20} />
                                </span>
                            </div>
                            <div className="dashKpiValue dashKpiValue--red">
                                {adminSummary?.pendingLeaves ?? "—"}
                            </div>
                            <span className="dashKpiHint">Awaiting HR action</span>
                        </article>
                    </section>

                    <section className="dashTwoCol">
                        <article className="dashPanel glass">
                            <div className="dashPanelHeader">
                                <span className="dashPanelTitle">Today&apos;s attendance</span>
                                <BarChart3 className="dashPanelIcon" size={20} />
                            </div>
                            <div className="dashProgressBlock">
                                <div className="dashProgressHead">
                                    <span style={{ color: "var(--text-secondary)" }}>
                                        Check-in rate
                                    </span>
                                    <strong>{attendanceRate.toFixed(1)}%</strong>
                                </div>
                                <div className="dashProgressTrack">
                                    <div
                                        className="dashProgressFill"
                                        style={{ width: `${Math.min(100, attendanceRate)}%` }}
                                    />
                                </div>
                            </div>
                            <ul className="dashInsightList">
                                <li className="dashInsightItem">
                                    <span>Checked in</span>
                                    <span className="dashInsightValue" style={{ color: "#34c759" }}>
                                        {adminSummary?.checkedInToday ?? 0}
                                    </span>
                                </li>
                                <li className="dashInsightItem">
                                    <span>On approved leave</span>
                                    <span className="dashInsightValue" style={{ color: "#ff9f0a" }}>
                                        {adminSummary?.onLeaveToday ?? 0}
                                    </span>
                                </li>
                                <li className="dashInsightItem">
                                    <span>Expected in office</span>
                                    <span className="dashInsightValue">
                                        {adminSummary?.expectedInOffice ?? "—"}
                                    </span>
                                </li>
                                <li className="dashInsightItem">
                                    <span>Not yet in</span>
                                    <span className="dashInsightValue">{absentToday}</span>
                                </li>
                                <li className="dashInsightItem">
                                    <span>Pending leave approvals</span>
                                    <span className="dashInsightValue" style={{ color: "#ff3b30" }}>
                                        {adminSummary?.pendingLeaves ?? 0}
                                    </span>
                                </li>
                            </ul>
                            {isLoadingLogs && (
                                <div className="dashLoading">
                                    <Loader2 className="animate-spin" size={22} />
                                </div>
                            )}
                        </article>

                        <article className="dashPanel glass">
                            <div className="dashPanelHeader">
                                <span className="dashPanelTitle">Quick actions</span>
                            </div>
                            <div className="dashQuickGrid">
                                {quickLinks.map((item) => (
                                    <Link key={item.path} href={item.path} className="dashQuickLink">
                                        <NavIcon name={item.icon} className="dashQuickIcon" size={18} />
                                        <span>{item.label}</span>
                                        <ArrowRight size={14} className="dashQuickArrow" />
                                    </Link>
                                ))}
                            </div>
                        </article>
                    </section>
                </>
            ) : (
                <>
                    <section className="dashMainGrid">
                        <article className="dashPanel dashPanel--accent glass">
                            <div className="dashPanelHeader">
                                <span className="dashPanelTitle">Attendance</span>
                                <Clock className="dashPanelIcon" size={20} />
                            </div>

                            <LiveClock variant="large" className="dashTimeBig" />

                            <div className="dashActions">
                                {!isCheckedIn ? (
                                    <button
                                        type="button"
                                        className="dashBtn dashBtn--primary"
                                        onClick={handleCheckIn}
                                        disabled={isLoadingLogs}
                                    >
                                        <LogIn size={18} />
                                        Check in
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="dashBtn dashBtn--ghost"
                                            onClick={() =>
                                                handleBreak(onBreak ? "break-end" : "break-start")
                                            }
                                            disabled={isLoadingLogs}
                                        >
                                            <Coffee size={18} />
                                            {onBreak ? "End break" : "Take break"}
                                        </button>
                                        <button
                                            type="button"
                                            className="dashBtn dashBtn--danger"
                                            onClick={handleCheckOut}
                                            disabled={isLoadingLogs}
                                        >
                                            <LogOut size={18} />
                                            Check out
                                        </button>
                                    </>
                                )}
                            </div>

                            <div>
                                <p
                                    className="statLabel"
                                    style={{ marginBottom: "0.5rem", fontSize: "0.75rem" }}
                                >
                                    Recent activity
                                </p>
                                {isLoadingLogs ? (
                                    <div className="dashLoading">
                                        <Loader2 className="animate-spin" size={22} />
                                    </div>
                                ) : recentLogs.length > 0 ? (
                                    <div className="dashLogList">
                                        {recentLogs.map((log) => {
                                            const active = !log.checkOut;
                                            return (
                                                <div key={log.id} className="dashLogItem">
                                                    <div>
                                                        <div className="dashLogDate">
                                                            {new Date(log.checkIn).toLocaleDateString(
                                                                undefined,
                                                                {
                                                                    weekday: "short",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                }
                                                            )}
                                                        </div>
                                                        <div className="dashLogTime">
                                                            {new Date(log.checkIn).toLocaleTimeString(
                                                                [],
                                                                { hour: "2-digit", minute: "2-digit" }
                                                            )}
                                                            {log.checkOut
                                                                ? ` — ${new Date(log.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                                                : " · Active session"}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`dashBadge ${
                                                            active
                                                                ? "dashBadge--active"
                                                                : log.status === "ON_TIME" ||
                                                                    log.status === "PRESENT"
                                                                  ? "dashBadge--ok"
                                                                  : log.status === "LATE"
                                                                    ? "dashBadge--late"
                                                                    : ""
                                                        }`}
                                                    >
                                                        {active
                                                            ? "Active"
                                                            : log.status.replace("_", " ")}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="dashEmpty">No attendance records yet.</p>
                                )}
                            </div>
                        </article>

                        <aside className="dashAside">
                            <article className="dashPanel glass">
                                <div className="dashPanelHeader">
                                    <span className="dashPanelTitle">This month</span>
                                    <Calendar className="dashPanelIcon" size={20} />
                                </div>
                                <div className="dashMiniStats">
                                    <div className="dashMiniStat">
                                        <div className="dashMiniStatLabel">Present days</div>
                                        <div className="dashMiniStatValue">
                                            {stats?.presentDays ?? 0}
                                            <span
                                                style={{
                                                    fontSize: "0.9rem",
                                                    fontWeight: 500,
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {" "}
                                                / {monthDenominator || "—"} workdays
                                            </span>
                                        </div>
                                    </div>
                                    <div className="dashMiniStat">
                                        <div className="dashMiniStatLabel">Late marks</div>
                                        <div className="dashMiniStatValue">
                                            {stats?.lateMarks ?? 0}
                                        </div>
                                        <span
                                            className={`dashTrend ${
                                                (stats?.lateMarks ?? 0) === 0
                                                    ? "dashTrend--good"
                                                    : "dashTrend--warn"
                                            }`}
                                        >
                                            {(stats?.lateMarks ?? 0) === 0 ? (
                                                <>
                                                    <CheckCircle2 size={12} /> On track
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle size={12} /> Improve punctuality
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </article>

                            <article className="dashPanel glass">
                                <div className="dashPanelHeader">
                                    <span className="dashPanelTitle">Discipline score</span>
                                    <TrendingUp className="dashPanelIcon" size={20} />
                                </div>
                                <div className="dashDiscipline">
                                    <div className="dashRingWrap">
                                        <svg className="dashRingSvg" width="88" height="88" viewBox="0 0 88 88">
                                            <defs>
                                                <linearGradient id="dashRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="var(--nuriek-blue)" />
                                                    <stop offset="100%" stopColor="var(--nuriek-accent)" />
                                                </linearGradient>
                                            </defs>
                                            <circle className="dashRingBg" cx="44" cy="44" r="40" />
                                            <circle
                                                className="dashRingFg"
                                                cx="44"
                                                cy="44"
                                                r="40"
                                                strokeDasharray="251.2"
                                                strokeDashoffset={ringOffset}
                                            />
                                        </svg>
                                        <div className="dashRingCenter">
                                            <span className="dashRingScore">{disciplineScore}</span>
                                            <span className="dashRingLabel">/ 100</span>
                                        </div>
                                    </div>
                                    <div className="dashDisciplineText">
                                        <span className="text-gradient" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                                            {disciplineScore >= 90
                                                ? "Excellent standing"
                                                : disciplineScore >= 70
                                                  ? "Good standing"
                                                  : "Needs attention"}
                                        </span>
                                        <p>
                                            {disciplineScore === 100
                                                ? "Strong month so far. Keep it up!"
                                                : "Based on late marks and weekdays without check-in this month (IST)."}
                                        </p>
                                    </div>
                                </div>
                            </article>

                            <article className="dashPanel glass">
                                <div className="dashPanelHeader">
                                    <span className="dashPanelTitle">Quick actions</span>
                                </div>
                                <div className="dashQuickGrid">
                                    {quickLinks.map((item) => (
                                        <Link key={item.path} href={item.path} className="dashQuickLink">
                                            <NavIcon name={item.icon} className="dashQuickIcon" size={18} />
                                            <span>{item.label}</span>
                                            <ArrowRight size={14} className="dashQuickArrow" />
                                        </Link>
                                    ))}
                                </div>
                            </article>
                        </aside>
                    </section>
                </>
            )}
        </div>
    );
}
