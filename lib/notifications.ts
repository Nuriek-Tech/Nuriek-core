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

const ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function item(
    partial: Omit<PortalNotification, "createdAt"> & { createdAt?: Date | string }
): PortalNotification {
    const createdAt =
        partial.createdAt instanceof Date
            ? partial.createdAt.toISOString()
            : partial.createdAt ?? new Date().toISOString();
    const { createdAt: _c, ...rest } = partial;
    return {
        tier: "action",
        ...rest,
        createdAt,
    };
}

function parseAuditMetadata(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function profileHref(userId: string, role?: string | null): string {
    if (role === ROLES.INTERN) return `/interns/${userId}`;
    return `/profile/${userId}`;
}

function auditLogToActivityNotification(log: {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    metadata: string | null;
    actorEmail: string | null;
    createdAt: Date;
}): PortalNotification | null {
    const meta = parseAuditMetadata(log.metadata);
    const who = log.actorEmail ? String(log.actorEmail).split("@")[0] : "Someone";

    if (log.action === "USER_ONBOARD" && log.entityId) {
        const email = String(meta.email ?? "new user");
        const role = String(meta.role ?? "EMPLOYEE");
        return item({
            id: `audit-${log.id}`,
            kind: "onboard",
            tier: "activity",
            title: "Employee onboarded",
            body: `${email} added as ${role.replace(/_/g, " ").toLowerCase()}${log.actorEmail ? ` by ${who}` : ""}.`,
            href: profileHref(log.entityId, role),
            createdAt: log.createdAt,
        });
    }

    if (log.action === "OFFER_ONBOARDING_SENT") {
        const ref = String(meta.ref ?? "offer");
        const workEmail = String(meta.workEmail ?? meta.sentTo ?? "");
        return item({
            id: `audit-${log.id}`,
            kind: "onboard",
            tier: "activity",
            title: "Onboarding email sent",
            body: `Portal credentials sent to ${workEmail || "candidate"} (${ref}).`,
            href: "/admin/offer-letter",
            createdAt: log.createdAt,
        });
    }

    if (
        (log.action === "OFFER_SIGNED" || log.action === "DOCUMENT_SIGN") &&
        log.entity === "OfferLetter"
    ) {
        const candidate = String(meta.candidate ?? meta.candidateName ?? "Candidate");
        const ref = String(meta.ref ?? "");
        return item({
            id: `audit-${log.id}`,
            kind: "offer",
            tier: "activity",
            title: "Offer accepted",
            body: `${candidate} signed${ref ? ` (${ref})` : ""}.`,
            href: meta.token ? `/offer/${meta.token}` : "/admin/offer-letter",
            createdAt: log.createdAt,
        });
    }

    if (log.action === "DOCUMENT_UPLOAD" && log.entity === "OfferLetter" && meta.emailedTo) {
        const ref = String(meta.ref ?? "");
        return item({
            id: `audit-${log.id}`,
            kind: "offer",
            tier: "activity",
            title: "Offer email sent",
            body: `Sent to ${meta.emailedTo}${ref ? ` · ${ref}` : ""}.`,
            href: meta.token ? `/offer/${meta.token}` : "/admin/offer-letter",
            createdAt: log.createdAt,
        });
    }

    if (log.action === "INTERN_CONVERT" && log.entityId) {
        return item({
            id: `audit-${log.id}`,
            kind: "people",
            tier: "activity",
            title: "Intern converted",
            body: `Intern promoted to employee${log.actorEmail ? ` · ${who}` : ""}.`,
            href: profileHref(log.entityId, ROLES.EMPLOYEE),
            createdAt: log.createdAt,
        });
    }

    if (log.action === "USER_DELETE") {
        const email = String(meta.deletedEmail ?? "user");
        return item({
            id: `audit-${log.id}`,
            kind: "people",
            tier: "activity",
            title: "User removed",
            body: `${email} removed from directory${log.actorEmail ? ` by ${who}` : ""}.`,
            href: "/directory",
            createdAt: log.createdAt,
        });
    }

    return null;
}

async function adminRecentActivityNotifications(): Promise<PortalNotification[]> {
    const since = new Date(Date.now() - ACTIVITY_WINDOW_MS);
    const list: PortalNotification[] = [];
    const seen = new Set<string>();

    const push = (n: PortalNotification) => {
        if (seen.has(n.id)) return;
        seen.add(n.id);
        list.push(n);
    };

    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                createdAt: { gte: since },
                OR: [
                    { action: { in: ["USER_ONBOARD", "OFFER_ONBOARDING_SENT", "INTERN_CONVERT", "USER_DELETE", "OFFER_SIGNED"] } },
                    { action: "DOCUMENT_SIGN", entity: "OfferLetter" },
                    { action: "DOCUMENT_UPLOAD", entity: "OfferLetter" },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 25,
        });

        for (const log of logs) {
            const n = auditLogToActivityNotification(log);
            if (n) push(n);
        }
    } catch (error) {
        console.error("[notifications] audit activity:", error);
    }

    try {
        const recentUsers = await prisma.user.findMany({
            where: { createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        for (const u of recentUsers) {
            push(
                item({
                    id: `user-created-${u.id}`,
                    kind: "onboard",
                    tier: "activity",
                    title: "New portal account",
                    body: `${u.name || u.email} · ${String(u.role).replace(/_/g, " ").toLowerCase()}`,
                    href: profileHref(u.id, u.role),
                    createdAt: u.createdAt,
                })
            );
        }
    } catch (error) {
        console.error("[notifications] user activity:", error);
    }

    try {
        const signedOffers = await prisma.offerLetter.findMany({
            where: { signedAt: { gte: since } },
            orderBy: { signedAt: "desc" },
            take: 10,
            select: {
                id: true,
                token: true,
                candidateName: true,
                refNumber: true,
                signedAt: true,
                onboardingEmailedAt: true,
            },
        });

        for (const o of signedOffers) {
            push(
                item({
                    id: `offer-signed-${o.id}`,
                    kind: "offer",
                    tier: "activity",
                    title: "Offer signed",
                    body: `${o.candidateName} · ${o.refNumber}${o.onboardingEmailedAt ? " · onboarding sent" : ""}`,
                    href: `/offer/${o.token}`,
                    createdAt: o.signedAt!,
                })
            );
        }
    } catch (error) {
        console.error("[notifications] offer activity:", error);
    }

    return list;
}

async function adminActionNotifications(role: Role): Promise<PortalNotification[]> {
    const { start: todayStart, end: todayEnd } = getISTDayBounds();

    const [
        pendingLeaves,
        hrPendingLeaves,
        pendingCertificates,
        pendingTimesheets,
        pendingFlows,
        lateToday,
    ] = await Promise.all([
        prisma.leave.count({ where: { status: "PENDING" } }),
        prisma.leave.count({
            where: { status: "PENDING", user: { role: ROLES.HR_ADMIN } },
        }),
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

    if (role === ROLES.FOUNDER && hrPendingLeaves > 0) {
        list.push(
            item({
                id: "founder-hr-leave-approval",
                kind: "leave",
                title: "HR leave awaiting your approval",
                body: `${hrPendingLeaves} HR request${hrPendingLeaves === 1 ? "" : "s"} need Super Admin sign-off.`,
                href: "/reports/leaves?status=PENDING",
            })
        );
    }

    const otherPendingLeaves =
        role === ROLES.HR_ADMIN ? pendingLeaves - hrPendingLeaves : pendingLeaves;

    if (otherPendingLeaves > 0) {
        list.push(
            item({
                id: "admin-pending-leaves",
                kind: "leave",
                title: "Leave requests pending",
                body: `${otherPendingLeaves} request${otherPendingLeaves === 1 ? "" : "s"} need review.`,
                href: "/reports/leaves?status=PENDING",
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
    const actionItems: PortalNotification[] = [];
    const activityItems: PortalNotification[] = [];

    if (isAdminRole(user.role)) {
        actionItems.push(...(await adminActionNotifications(user.role)));
        activityItems.push(...(await adminRecentActivityNotifications()));
    } else if (user.role === ROLES.MANAGER) {
        actionItems.push(...(await managerNotifications()));
    }

    actionItems.push(...(await personalNotifications(user)));

    const seen = new Set<string>();
    const dedupe = (list: PortalNotification[]) =>
        list.filter((n) => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
        });

    const actions = dedupe(actionItems).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const activity = dedupe(activityItems).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return [...actions, ...activity];
}
