import { prisma } from "@/lib/prisma";
import { ROLES, type Role, isAdminRole } from "@/lib/constants";
import { hasAnyRole } from "@/lib/roles";
import { getISTDayBounds, WORKFORCE_ROLES } from "@/lib/dashboard-metrics";
import type { PortalNotification } from "@/lib/api-types";

type NotifyUser = {
    id: string;
    email?: string | null;
    role: Role;
    mustChangePassword: boolean;
};

function item(
    partial: Omit<PortalNotification, "createdAt"> & { createdAt?: Date | string }
): PortalNotification {
    const createdAt =
        partial.createdAt instanceof Date
            ? partial.createdAt.toISOString()
            : partial.createdAt ?? new Date().toISOString();
    const { createdAt: _c, ...rest } = partial;
    return { ...rest, createdAt };
}

async function adminActionNotifications(): Promise<PortalNotification[]> {
    const { start: todayStart, end: todayEnd } = getISTDayBounds();

    const [
        pendingLeaves,
        pendingCertificates,
        pendingTimesheets,
        pendingFlows,
        lateToday,
    ] = await Promise.all([
        prisma.leave.count({ where: { status: "PENDING" } }),
        prisma.certificateRequest.count({ where: { status: "PENDING" } }),
        prisma.timesheet.count({ where: { status: "SUBMITTED" } }),
        prisma.document.count({
            where: {
                type: { not: "DRIVE" },
                status: { in: ["PENDING", "PARTIALLY_SIGNED"] },
                requiredSigners: { some: {} },
            },
        }),
        prisma.attendance.count({
            where: {
                checkIn: { gte: todayStart, lte: todayEnd },
                status: "LATE",
                user: { role: { in: WORKFORCE_ROLES } },
            },
        }),
    ]);

    const list: PortalNotification[] = [];

    if (pendingLeaves > 0) {
        list.push(
            item({
                id: "admin-pending-leaves",
                kind: "leave",
                title: "Leave requests pending",
                body: `${pendingLeaves} request${pendingLeaves === 1 ? "" : "s"} need review.`,
                href: "/reports/leaves",
            })
        );
    }
    if (pendingCertificates > 0) {
        list.push(
            item({
                id: "admin-pending-certs",
                kind: "certificate",
                title: "Certificate requests",
                body: `${pendingCertificates} certificate${pendingCertificates === 1 ? "" : "s"} awaiting approval.`,
                href: "/certificates",
            })
        );
    }
    if (pendingTimesheets > 0) {
        list.push(
            item({
                id: "admin-pending-timesheets",
                kind: "timesheet",
                title: "Timesheets to review",
                body: `${pendingTimesheets} submission${pendingTimesheets === 1 ? "" : "s"} pending approval.`,
                href: "/admin/timesheets",
            })
        );
    }
    if (pendingFlows > 0) {
        list.push(
            item({
                id: "admin-pending-flows",
                kind: "document",
                title: "Document signature flows",
                body: `${pendingFlows} document flow${pendingFlows === 1 ? "" : "s"} in progress.`,
                href: "/admin/documents",
            })
        );
    }
    if (lateToday > 0) {
        list.push(
            item({
                id: "admin-late-today",
                kind: "attendance",
                title: "Late check-ins today",
                body: `${lateToday} employee${lateToday === 1 ? "" : "s"} checked in late today.`,
                href: "/reports/attendance",
            })
        );
    }

    return list;
}

async function personalNotifications(user: NotifyUser): Promise<PortalNotification[]> {
    const list: PortalNotification[] = [];

    if (user.mustChangePassword) {
        list.push(
            item({
                id: "account-password",
                kind: "account",
                title: "Password change required",
                body: "Update your password to continue using all portal features.",
                href: "/settings?changePassword=required",
            })
        );
    }

    const unsignedDocs = await prisma.document.findMany({
        where: {
            type: { not: "DRIVE" },
            status: { in: ["PENDING", "PARTIALLY_SIGNED"] },
            requiredSigners: {
                some: {
                    signedAt: null,
                    OR: [{ userId: user.id }, { email: user.email || "" }],
                },
            },
        },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
    });

    for (const doc of unsignedDocs) {
        list.push(
            item({
                id: `doc-sign-${doc.id}`,
                kind: "document",
                title: "Signature required",
                body: `Review and sign “${doc.title}”.`,
                href: "/documents",
                createdAt: doc.updatedAt,
            })
        );
    }

    const rejectedTimesheets = await prisma.timesheet.findMany({
        where: { userId: user.id, status: "REJECTED" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, date: true, updatedAt: true },
    });

    for (const ts of rejectedTimesheets) {
        list.push(
            item({
                id: `ts-rejected-${ts.id}`,
                kind: "timesheet",
                title: "Timesheet rejected",
                body: `Resubmit your timesheet for ${new Date(ts.date).toLocaleDateString()}.`,
                href: "/attendance",
                createdAt: ts.updatedAt,
            })
        );
    }

    const recentCertUpdates = await prisma.certificateRequest.findMany({
        where: {
            userId: user.id,
            status: { in: ["APPROVED", "REJECTED"] },
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, type: true, status: true, updatedAt: true },
    });

    for (const cert of recentCertUpdates) {
        list.push(
            item({
                id: `cert-${cert.status.toLowerCase()}-${cert.id}`,
                kind: "certificate",
                title:
                    cert.status === "APPROVED"
                        ? "Certificate approved"
                        : "Certificate request declined",
                body: `Your ${cert.type.replace(/_/g, " ").toLowerCase()} request was ${cert.status.toLowerCase()}.`,
                href: "/certificates",
                createdAt: cert.updatedAt,
            })
        );
    }

    const attendanceRoles: Role[] = [
        ROLES.MANAGER,
        ROLES.TEAM_LEAD,
        ROLES.EMPLOYEE,
        ROLES.INTERN,
        ROLES.CONTRACTOR,
        ROLES.HR_ADMIN,
    ];

    if (hasAnyRole(user.role, attendanceRoles)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayLog = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                checkIn: { gte: today, lt: tomorrow },
            },
        });

        if (!todayLog) {
            list.push(
                item({
                    id: "attendance-checkin",
                    kind: "attendance",
                    title: "Check in for today",
                    body: "You have not checked in yet. Use Quick Check-in or Time Management.",
                    href: "/attendance",
                })
            );
        } else if (!todayLog.checkOut) {
            list.push(
                item({
                    id: "attendance-checkout",
                    kind: "attendance",
                    title: "Active shift",
                    body: `Checked in at ${todayLog.checkIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Remember to check out.`,
                    href: "/attendance",
                    createdAt: todayLog.checkIn,
                })
            );
        }
    }

    return list;
}

async function managerNotifications(): Promise<PortalNotification[]> {
    const pendingLeaves = await prisma.leave.count({ where: { status: "PENDING" } });
    if (pendingLeaves === 0) return [];

    return [
        item({
            id: "manager-pending-leaves",
            kind: "leave",
            title: "Team leave requests",
            body: `${pendingLeaves} pending leave${pendingLeaves === 1 ? "" : "s"} in the organization.`,
            href: "/reports/leaves",
        }),
    ];
}

/** Build live, role-aware notifications for the portal bell. */
export async function buildNotificationsForUser(
    user: NotifyUser
): Promise<PortalNotification[]> {
    const items: PortalNotification[] = [];

    if (isAdminRole(user.role)) {
        items.push(...(await adminActionNotifications()));
    } else if (user.role === ROLES.MANAGER) {
        items.push(...(await managerNotifications()));
    }

    items.push(...(await personalNotifications(user)));

    const seen = new Set<string>();
    const unique = items.filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
    });

    unique.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return unique;
}
