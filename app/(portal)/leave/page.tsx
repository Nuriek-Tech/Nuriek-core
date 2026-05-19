"use client";

import { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    Plus,
    Clock,
    ChevronLeft,
    ChevronRight,
    Loader2,
    X,
    Trash2,
    Sun
} from "lucide-react";
import "@/styles/dashboard.css";
import { useSession } from "next-auth/react";
import type { HolidayRecord, LeaveBalance, LeaveRecord } from "@/lib/api-types";

type LeaveApiResponse = { leaves: LeaveRecord[]; balance: LeaveBalance };

export default function LeavePage() {
    const { data: session } = useSession();
    const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
    const [balance, setBalance] = useState<LeaveBalance | null>(null);
    const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calendar navigation state
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());

    const [formData, setFormData] = useState({
        type: "CASUAL",
        startDate: "",
        endDate: "",
        reason: "",
    });

    const [holidayData, setHolidayData] = useState({
        name: "",
        date: "",
        type: "PUBLIC",
    });

    const userRole = session?.user?.role;
    const isAdmin = userRole === "HR_ADMIN" || userRole === "FOUNDER";

    useEffect(() => {
        if (session) fetchData();
    }, [session]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [leavesRes, holidaysRes] = await Promise.all([
                fetch("/api/leave"),
                fetch("/api/holidays")
            ]);
            if (leavesRes.ok) {
                const data: LeaveRecord[] | LeaveApiResponse = await leavesRes.json();
                if (Array.isArray(data)) {
                    setLeaves(data);
                } else {
                    setLeaves(data.leaves ?? []);
                    setBalance(data.balance ?? null);
                }
            }
            if (holidaysRes.ok) setHolidays(await holidaysRes.json());
        } catch {
            console.error("Failed to fetch data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowApplyModal(false);
                setFormData({ type: "CASUAL", startDate: "", endDate: "", reason: "" });
                fetchData();
            } else {
                alert("Failed to apply for leave");
            }
        } catch {
            alert("Failed to apply for leave");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/holidays", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(holidayData),
            });
            if (res.ok) {
                setShowHolidayModal(false);
                setHolidayData({ name: "", date: "", type: "PUBLIC" });
                fetchData();
            } else {
                alert("Failed to add holiday – check permissions");
            }
        } catch {
            alert("Failed to add holiday");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        if (!confirm("Delete this holiday from the calendar?")) return;
        try {
            const res = await fetch("/api/holidays", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) fetchData();
            else alert("Failed to delete holiday");
        } catch {
            alert("Failed to delete holiday");
        }
    };

    // --- Calendar helpers ---
    const prevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthLabel = new Date(calYear, calMonth, 1).toLocaleString("default", { month: "long", year: "numeric" });

    // Build sets of highlighted dates for this month
    const holidayMap: Record<number, { name: string; type: string; id: string }> = {};
    holidays.forEach(h => {
        const d = new Date(h.date);
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
            holidayMap[d.getDate()] = { name: h.name, type: h.type, id: h.id };
        }
    });

    const leaveDayMap: Record<number, { type: string; status: string }> = {};
    leaves.filter(l => l.status === "APPROVED").forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const cur = new Date(start);
        while (cur <= end) {
            if (cur.getFullYear() === calYear && cur.getMonth() === calMonth) {
                leaveDayMap[cur.getDate()] = { type: l.type, status: l.status };
            }
            cur.setDate(cur.getDate() + 1);
        }
    });

    const totalLeaves = balance?.total ?? 22;
    const usedLeaves = balance?.used ?? 0;
    const remainingLeaves = balance?.remaining ?? totalLeaves - usedLeaves;
    const pendingLeaves = balance?.pending ?? leaves.filter(l => l.status === "PENDING").length;

    // Upcoming holidays (next 5)
    const upcomingHolidays = holidays
        .filter(h => new Date(h.date) >= today)
        .slice(0, 5);

    return (
        <div className="docContainer">
            {/* Header */}
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Leave &amp; Holiday Management</h1>
                    <p>Request time off, manage balances, and view the holiday calendar</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    {isAdmin && (
                        <button className="checkInButton" style={{ background: "rgba(10,132,255,0.15)", border: "1px solid rgba(10,132,255,0.3)", color: "#0a84ff" }} onClick={() => setShowHolidayModal(true)}>
                            <Plus size={18} />
                            <span>Add Holiday</span>
                        </button>
                    )}
                    <button className="checkInButton" onClick={() => setShowApplyModal(true)}>
                        <Plus size={18} />
                        <span>Apply for Leave</span>
                    </button>
                </div>
            </header>

            {/* --- Apply Leave Modal --- */}
            {showApplyModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
                    <form onSubmit={handleApply} className="card glass" style={{ width: "100%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
                        <button type="button" onClick={() => setShowApplyModal(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "white", cursor: "pointer" }}>
                            <X size={20} />
                        </button>
                        <h2 style={{ marginBottom: "1.5rem" }}>Apply for Time Off</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div className="inputGroup">
                                <label className="statLabel">Leave Type</label>
                                <select className="input" required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="CASUAL">Casual Leave</option>
                                    <option value="SICK">Sick Leave</option>
                                    <option value="MATERNITY">Maternity Leave</option>
                                    <option value="PATERNITY">Paternity Leave</option>
                                    <option value="UNPAID">Unpaid Leave</option>
                                </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div className="inputGroup">
                                    <label className="statLabel">Start Date</label>
                                    <input type="date" className="input" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div className="inputGroup">
                                    <label className="statLabel">End Date</label>
                                    <input type="date" className="input" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="inputGroup">
                                <label className="statLabel">Reason</label>
                                <textarea className="input" rows={3} placeholder="Explain the reason for leave..." value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                            </div>
                            <button type="submit" className="checkInButton" disabled={isSubmitting} style={{ marginTop: "0.5rem", width: "100%" }}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Application"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- Add Holiday Modal --- */}
            {showHolidayModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
                    <form onSubmit={handleAddHoliday} className="card glass" style={{ width: "100%", maxWidth: "400px", padding: "2rem", position: "relative" }}>
                        <button type="button" onClick={() => setShowHolidayModal(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "white", cursor: "pointer" }}>
                            <X size={20} />
                        </button>
                        <h2 style={{ marginBottom: "1.5rem" }}>Add Holiday to Calendar</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div className="inputGroup">
                                <label className="statLabel">Holiday Name</label>
                                <input type="text" className="input" required placeholder="e.g. Diwali" value={holidayData.name} onChange={e => setHolidayData({ ...holidayData, name: e.target.value })} />
                            </div>
                            <div className="inputGroup">
                                <label className="statLabel">Date</label>
                                <input type="date" className="input" required value={holidayData.date} onChange={e => setHolidayData({ ...holidayData, date: e.target.value })} />
                            </div>
                            <div className="inputGroup">
                                <label className="statLabel">Type</label>
                                <select className="input" value={holidayData.type} onChange={e => setHolidayData({ ...holidayData, type: e.target.value })}>
                                    <option value="PUBLIC">Public Holiday</option>
                                    <option value="OPTIONAL">Optional / Restricted</option>
                                    <option value="COMPANY">Company Specific</option>
                                </select>
                            </div>
                            <button type="submit" className="checkInButton" disabled={isSubmitting} style={{ marginTop: "0.5rem", width: "100%" }}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Add Holiday"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats + Calendar row */}
            <div className="grid" style={{ gridTemplateColumns: "1fr 1.6fr", gap: "2rem" }}>
                {/* Leave Balance */}
                <section className="card glass">
                    <div className="cardHeader">
                        <span className="cardTitle">Leave Balance</span>
                        <Clock className="cardIcon" size={20} />
                    </div>
                    <div className="statsGrid">
                        <div className="statItem">
                            <span className="statLabel">Annual Quota</span>
                            <span className="statValue">{totalLeaves} days</span>
                        </div>
                        <div className="statItem">
                            <span className="statLabel">Used (Approved)</span>
                            <span className="statValue" style={{ color: "#ff9f0a" }}>{usedLeaves}</span>
                        </div>
                        <div className="statItem">
                            <span className="statLabel">Remaining</span>
                            <span className="statValue" style={{ color: "#34c759" }}>{remainingLeaves}</span>
                        </div>
                        <div className="statItem">
                            <span className="statLabel">Pending Review</span>
                            <span className="statValue" style={{ color: "#ff9f0a" }}>{pendingLeaves}</span>
                        </div>
                    </div>

                    {/* Color legend */}
                    <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Calendar Legend</p>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: "#ff9f0a", display: "inline-block" }} /> Public Holiday
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: "#5e5ce6", display: "inline-block" }} /> Company Holiday
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: "#34c759", display: "inline-block" }} /> Approved Leave
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--nuriek-blue)", display: "inline-block" }} /> Today
                            </span>
                        </div>
                    </div>
                </section>

                {/* === FULL INTERACTIVE CALENDAR === */}
                <section className="card glass">
                    <div className="cardHeader">
                        <span className="cardTitle">Holiday & Leave Calendar</span>
                        <CalendarIcon className="cardIcon" size={20} />
                    </div>

                    {/* Month navigation */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", marginTop: "0.5rem" }}>
                        <button onClick={prevMonth} className="actionButton" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{monthLabel}</span>
                        <button onClick={nextMonth} className="actionButton" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem", textAlign: "center", marginBottom: "0.4rem" }}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                            <span key={d} style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{d}</span>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem" }}>
                        {/* Empty cells for first day offset */}
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} />)}

                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                            const holiday = holidayMap[day];
                            const leave = leaveDayMap[day];
                            const isWeekend = [0, 6].includes(new Date(calYear, calMonth, day).getDay());

                            let bg = "transparent";
                            let color = isWeekend ? "rgba(255,255,255,0.3)" : "inherit";
                            let title = "";

                            if (holiday) {
                                bg = holiday.type === "COMPANY" ? "rgba(94,92,230,0.25)" : holiday.type === "OPTIONAL" ? "rgba(255,159,10,0.15)" : "rgba(255,159,10,0.25)";
                                color = holiday.type === "COMPANY" ? "#5e5ce6" : "#ff9f0a";
                                title = holiday.name;
                            }
                            if (leave) {
                                bg = "rgba(52,199,89,0.2)";
                                color = "#34c759";
                                title = `${leave.type.replace("_", " ")} (${leave.status})`;
                            }
                            if (isToday) {
                                bg = "var(--nuriek-blue)";
                                color = "white";
                            }

                            return (
                                <div
                                    key={day}
                                    title={title || undefined}
                                    style={{
                                        padding: "0.4rem 0.2rem",
                                        fontSize: "0.8rem",
                                        borderRadius: "var(--radius-sm)",
                                        background: bg,
                                        color: color,
                                        fontWeight: isToday ? 700 : holiday || leave ? 600 : "normal",
                                        textAlign: "center",
                                        cursor: title ? "default" : "default",
                                        position: "relative",
                                        border: holiday && !isToday ? `1px solid ${color}20` : "none",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    {day}
                                    {(holiday || leave) && !isToday && (
                                        <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: color, display: "block" }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* Leave History */}
            <section className="card glass" style={{ marginTop: "2rem" }}>
                <div className="cardHeader">
                    <span className="cardTitle">My Leave History</span>
                </div>
                <div className="recentLogs">
                    {isLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : leaves.length > 0 ? leaves.map(leave => (
                        <div key={leave.id} className="logItem">
                            <div className="logInfo">
                                <span className="logTitle">{leave.type.replace("_", " ")}</span>
                                <span className="logTime">{new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}</span>
                                {leave.reason && <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>{leave.reason}</p>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span className={`logStatus ${leave.status === "APPROVED" ? "statusOnTime" : "statusLate"}`}
                                    style={leave.status === "PENDING" ? { background: "rgba(255,159,10,0.1)", color: "#ff9f0a" } : undefined}>
                                    {leave.status}
                                </span>
                            </div>
                        </div>
                    )) : (
                        <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>No leave history yet.</p>
                    )}
                </div>
            </section>

            {/* Upcoming Holidays + Admin Edit */}
            <section className="card glass" style={{ marginTop: "1.5rem", border: "1px solid rgba(var(--nuriek-blue-rgb), 0.2)" }}>
                <div className="cardHeader">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <Sun size={18} style={{ color: "#ff9f0a" }} />
                        <span className="cardTitle">Upcoming Holidays</span>
                    </div>
                    {isAdmin && (
                        <button className="checkInButton" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", height: "auto" }} onClick={() => setShowHolidayModal(true)}>
                            <Plus size={14} /> Add Holiday
                        </button>
                    )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                    {upcomingHolidays.length > 0 ? upcomingHolidays.map(h => (
                        <div key={h.id} className="logItem">
                            <div className="logInfo">
                                <span className="logTitle">{h.name}</span>
                                <span className="logTime">{new Date(h.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                                <span style={{ fontSize: "0.7rem", marginTop: "0.2rem", display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "100px", background: h.type === "PUBLIC" ? "rgba(255,159,10,0.15)" : "rgba(94,92,230,0.15)", color: h.type === "PUBLIC" ? "#ff9f0a" : "#5e5ce6" }}>
                                    {h.type}
                                </span>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDeleteHoliday(h.id)} style={{ background: "rgba(255,69,58,0.1)", color: "#ff453a", border: "none", borderRadius: "var(--radius-sm)", padding: "0.4rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </div>
                    )) : (
                        <p style={{ gridColumn: "1/-1", padding: "1rem", color: "var(--text-tertiary)" }}>No upcoming holidays scheduled.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
