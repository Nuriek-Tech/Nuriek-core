"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, HelpCircle, Activity, Menu, Sun, Moon, LogOut } from "lucide-react";
import { useSidebar } from "@/components/Providers";
import { useTheme } from "@/components/ThemeProvider";
import NotificationBell from "@/components/NotificationBell";
import { canAccessContactHr, isSuperAdminRole } from "@/lib/constants";
import type { AttendanceLog } from "@/lib/api-types";
import "./header.css";

export default function Header() {
    const { data: session } = useSession();
    const { toggle } = useSidebar();
    const { theme, toggleTheme } = useTheme();

    const role = session?.user?.role;
    const showQuickCheckIn = role ? !isSuperAdminRole(role) : false;
    const showContactHr = canAccessContactHr(role);

    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInBusy, setCheckInBusy] = useState(false);
    const [checkInMsg, setCheckInMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
        null
    );

    const syncAttendance = useCallback(async () => {
        if (!showQuickCheckIn) return;
        try {
            const res = await fetch("/api/attendance", { cache: "no-store" });
            if (!res.ok) return;
            const logs: AttendanceLog[] = await res.json();
            const today = new Date().toDateString();
            const active = logs.find(
                (l) =>
                    new Date(l.checkIn).toDateString() === today && !l.checkOut
            );
            setIsCheckedIn(Boolean(active));
        } catch {
            /* ignore */
        }
    }, [showQuickCheckIn]);

    useEffect(() => {
        if (session?.user && showQuickCheckIn) {
            syncAttendance();
        }
    }, [session, showQuickCheckIn, syncAttendance]);

    useEffect(() => {
        const onUpdate = () => syncAttendance();
        window.addEventListener("nuriek-attendance-updated", onUpdate);
        return () => window.removeEventListener("nuriek-attendance-updated", onUpdate);
    }, [syncAttendance]);

    const handleQuickCheckIn = async () => {
        if (!showQuickCheckIn || checkInBusy) return;
        setCheckInBusy(true);
        setCheckInMsg(null);
        const action = isCheckedIn ? "check-out" : "check-in";
        try {
            const res = await fetch(`/api/attendance/${action}`, { method: "POST" });
            if (res.ok) {
                const next = !isCheckedIn;
                setIsCheckedIn(next);
                setCheckInMsg({
                    type: "ok",
                    text: next ? "Checked in successfully." : "Checked out. Have a great day!",
                });
                window.dispatchEvent(new CustomEvent("nuriek-attendance-updated"));
            } else {
                const data = await res.json().catch(() => ({}));
                setCheckInMsg({
                    type: "err",
                    text:
                        (data as { error?: string }).error ||
                        `Could not complete ${action.replace("-", " ")}.`,
                });
            }
        } catch {
            setCheckInMsg({ type: "err", text: "Network error. Try again." });
        } finally {
            setCheckInBusy(false);
            setTimeout(() => setCheckInMsg(null), 4000);
        }
    };

    return (
        <header className="header glass">
            <button
                type="button"
                className="mobileMenuButton"
                onClick={toggle}
                aria-label="Open menu"
            >
                <Menu size={24} />
            </button>
            <div className="searchWrapper">
                <Search className="searchIcon" size={18} />
                <input
                    type="text"
                    className="searchInput"
                    placeholder="Search for employees, tasks, or documents..."
                />
            </div>

            <div className="actions">
                <div className="quickActions">
                    <button
                        type="button"
                        className="actionButton themeToggle"
                        onClick={toggleTheme}
                        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {showContactHr && (
                        <Link
                            href="/contact-hr"
                            className="actionButton"
                            aria-label="Contact HR"
                            title="Contact HR"
                        >
                            <HelpCircle size={20} />
                        </Link>
                    )}
                    <NotificationBell />
                </div>

                {showQuickCheckIn && (
                    <div className="headerCheckInWrap">
                        <button
                            type="button"
                            className={`checkInButton headerCheckIn ${isCheckedIn ? "headerCheckIn--out" : ""}`}
                            onClick={handleQuickCheckIn}
                            disabled={checkInBusy}
                            title={isCheckedIn ? "Check out for today" : "Check in for today"}
                        >
                            {checkInBusy ? (
                                <span className="headerCheckInSpinner" />
                            ) : isCheckedIn ? (
                                <LogOut size={18} />
                            ) : (
                                <Activity size={18} />
                            )}
                            <span>{isCheckedIn ? "Check out" : "Quick Check-in"}</span>
                        </button>
                        {checkInMsg && (
                            <p
                                className={`headerCheckInMsg headerCheckInMsg--${checkInMsg.type}`}
                                role="status"
                            >
                                {checkInMsg.text}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
