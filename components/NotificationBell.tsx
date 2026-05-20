"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Bell,
    FileText,
    Calendar,
    Clock,
    BadgeCheck,
    Activity,
    Shield,
    Loader2,
    FileSignature,
    UserPlus,
    Users,
} from "lucide-react";
import type { PortalNotification } from "@/lib/api-types";
import type { LucideIcon } from "lucide-react";
import {
    dismissNotificationIds,
    loadDismissedNotificationIds,
} from "@/lib/notification-dismiss";

const KIND_ICONS: Record<PortalNotification["kind"], LucideIcon> = {
    leave: Calendar,
    timesheet: Clock,
    certificate: BadgeCheck,
    document: FileText,
    attendance: Activity,
    account: Shield,
    offer: FileSignature,
    onboard: UserPlus,
    people: Users,
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [notifications, setNotifications] = useState<PortalNotification[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const dismissed = loadDismissedNotificationIds();
                const incoming: PortalNotification[] = data.notifications ?? [];
                setNotifications(
                    incoming.filter((n) => !dismissed.has(n.id))
                );
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!hasLoaded) return;
        const interval = setInterval(fetchNotifications, 60_000);
        const onAttendance = () => fetchNotifications();
        window.addEventListener("nuriek-attendance-updated", onAttendance);
        return () => {
            clearInterval(interval);
            window.removeEventListener("nuriek-attendance-updated", onAttendance);
        };
    }, [hasLoaded, fetchNotifications]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                panelRef.current?.contains(target) ||
                buttonRef.current?.contains(target)
            ) {
                return;
            }
            setOpen(false);
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const actionItems = notifications.filter((n) => n.tier !== "activity");
    const activityItems = notifications.filter((n) => n.tier === "activity");
    const unreadCount = actionItems.length;

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        dismissNotificationIds(notifications.map((n) => n.id));
        setNotifications([]);
    };

    const renderList = (items: PortalNotification[]) => (
        <ul className="notifList">
            {items.map((n) => {
                const Icon = KIND_ICONS[n.kind] ?? Bell;
                return (
                    <li key={n.id}>
                        <Link
                            href={n.href}
                            className={`notifItem${n.tier === "activity" ? " notifItem--activity" : ""}`}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                        >
                            <span className={`notifItemIcon notifItemIcon--${n.kind}`}>
                                <Icon size={16} />
                            </span>
                            <span className="notifItemContent">
                                <span className="notifItemTitle">{n.title}</span>
                                <span className="notifItemBody">{n.body}</span>
                                <span className="notifItemTime">{timeAgo(n.createdAt)}</span>
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <div className="notifWrap" ref={panelRef}>
            <button
                ref={buttonRef}
                type="button"
                className={`actionButton notifBellBtn ${open ? "notifBellBtn--open" : ""}`}
                aria-label="Notifications"
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => {
                    const next = !open;
                    setOpen(next);
                    if (next) {
                        setLoading(true);
                        fetchNotifications();
                    }
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notifBadge" aria-hidden>
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="notifPanel glass" role="menu">
                    <div className="notifPanelHead">
                        <span className="notifPanelTitle">Notifications</span>
                        {unreadCount > 0 ? (
                            <span className="notifPanelCount">{unreadCount} to review</span>
                        ) : activityItems.length > 0 ? (
                            <span className="notifPanelCount notifPanelCount--muted">Activity</span>
                        ) : null}
                    </div>

                    <div className="notifPanelBody">
                        {loading ? (
                            <div className="notifEmpty">
                                <Loader2 className="animate-spin" size={22} />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notifEmpty">
                                <Bell size={28} className="notifEmptyIcon" />
                                <p>You&apos;re all caught up</p>
                                <span className="notifEmptySub">
                                    No pending items or recent activity
                                </span>
                            </div>
                        ) : (
                            <>
                                {actionItems.length > 0 && (
                                    <>
                                        <p className="notifSectionLabel">Needs attention</p>
                                        {renderList(actionItems)}
                                    </>
                                )}
                                {activityItems.length > 0 && (
                                    <>
                                        <p className="notifSectionLabel">Recent activity (14 days)</p>
                                        {renderList(activityItems)}
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="notifPanelFoot">
                        <button
                            type="button"
                            className="notifClearBtn"
                            onClick={handleClearAll}
                            disabled={notifications.length === 0}
                        >
                            Clear all
                        </button>
                        <button
                            type="button"
                            className="notifRefreshBtn"
                            onClick={() => {
                                setLoading(true);
                                fetchNotifications();
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
