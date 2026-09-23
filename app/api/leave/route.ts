import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { getLeaveBalance, countInclusiveDays } from "@/lib/leave";
import { isLeaveExemptRole } from "@/lib/leave-approval";
import { validateLeaveInput } from "@/lib/leave-request";
import { logAudit } from "@/lib/audit";
import { createLeaveApprovalTokens, LEAVE_APPROVAL_EXPIRY_MS } from "@/lib/leave-approval-token";
import { sendLeaveApprovalRequestEmail } from "@/lib/mail";
import { portalEmailUrl } from "@/lib/portal-url";
import type { Role } from "@/lib/constants";
import { REPORTING_MANAGER_ROLES } from "@/lib/reporting-manager";

function formatEmailDate(d: Date): string {
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const [leaves, dbUser, fallbackApprover] = await Promise.all([
            prisma.leave.findMany({
                where: { userId: user.id },
                orderBy: { startDate: "desc" },
            }),
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    reportsTo: { select: { email: true, name: true, isActive: true, role: true } },
                },
            }),
            prisma.user.findFirst({ where: { isActive: true, role: { in: user.role === "HR_ADMIN" ? ["FOUNDER"] : ["HR_ADMIN", "FOUNDER"] }, email: { not: null } }, select: { email: true, name: true }, orderBy: { createdAt: "asc" } }),
        ]);

        const exempt = isLeaveExemptRole(user.role);
        const balance = exempt
            ? null
            : await getLeaveBalance(user.id, user.role as Role);

        return NextResponse.json({
            leaves,
            balance,
            leaveExempt: exempt,
            defaultReportingManagerEmail: dbUser?.reportsTo?.isActive && REPORTING_MANAGER_ROLES.includes(dbUser.reportsTo.role as (typeof REPORTING_MANAGER_ROLES)[number]) && (user.role !== "HR_ADMIN" || dbUser.reportsTo.role === "FOUNDER") ? dbUser.reportsTo.email : fallbackApprover?.email ?? null,
            defaultReportingManagerName: dbUser?.reportsTo?.isActive && REPORTING_MANAGER_ROLES.includes(dbUser.reportsTo.role as (typeof REPORTING_MANAGER_ROLES)[number]) && (user.role !== "HR_ADMIN" || dbUser.reportsTo.role === "FOUNDER") ? dbUser.reportsTo.name : fallbackApprover?.name ?? null,
        });
    } catch {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    if (isLeaveExemptRole(user.role)) {
        return NextResponse.json(
            { error: "Super Admin accounts do not apply for leave through the portal." },
            { status: 403 }
        );
    }

    try {
        const validated = validateLeaveInput(await req.json());
        if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
        const { type, start, end, reason } = validated;
        const requestedDays = countInclusiveDays(start, end);
        const [dbUser, fallbackApprover] = await Promise.all([
            prisma.user.findUnique({ where: { id: user.id }, select: { reportsTo: { select: { id: true, email: true, isActive: true, role: true } } } }),
            prisma.user.findFirst({ where: { isActive: true, role: { in: user.role === "HR_ADMIN" ? ["FOUNDER"] : ["HR_ADMIN", "FOUNDER"] }, email: { not: null } }, select: { email: true }, orderBy: { createdAt: "asc" } }),
        ]);
        const manager = dbUser?.reportsTo;
        const validManager = manager?.isActive && manager.id !== user.id && manager.email && REPORTING_MANAGER_ROLES.includes(manager.role as (typeof REPORTING_MANAGER_ROLES)[number]) &&
            (user.role !== "HR_ADMIN" || manager.role === "FOUNDER");
        const managerEmail = validManager ? manager.email : fallbackApprover?.email;
        if (!managerEmail) return NextResponse.json({ error: "No approver is configured. Contact HR." }, { status: 409 });

        const overlapping = await prisma.leave.findFirst({
            where: { userId: user.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } },
            select: { id: true },
        });
        if (overlapping) return NextResponse.json({ error: "These dates overlap an existing leave request" }, { status: 409 });
        const balance = await getLeaveBalance(user.id, user.role as Role);

        if (requestedDays > balance.remaining) {
            return NextResponse.json(
                {
                    error: `Insufficient leave balance. You have ${balance.remaining} day(s) remaining.`,
                },
                { status: 400 }
            );
        }

        const leave = await prisma.leave.create({
            data: {
                userId: user.id,
                type,
                startDate: start,
                endDate: end,
                reason,
                reportingManagerEmail: managerEmail,
                status: "PENDING",
            },
        });

        const { approveToken, rejectToken } = await createLeaveApprovalTokens(leave.id);

        const emailResult = await sendLeaveApprovalRequestEmail({
            to: managerEmail,
            employeeName: user.name || user.email || "Employee",
            employeeEmail: user.email || "",
            leaveType: type,
            startDate: formatEmailDate(start),
            endDate: formatEmailDate(end),
            days: requestedDays,
            reason,
            approveUrl: portalEmailUrl(`/api/leave/respond/${approveToken}`),
            rejectUrl: portalEmailUrl(`/api/leave/respond/${rejectToken}`),
            expiresDays: Math.round(LEAVE_APPROVAL_EXPIRY_MS / (24 * 60 * 60 * 1000)),
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "LEAVE_REQUEST",
            entity: "Leave",
            entityId: leave.id,
            metadata: {
                type,
                days: requestedDays,
                reportingManagerEmail: managerEmail,
                emailSent: emailResult.success,
            },
        });

        return NextResponse.json({
            ...leave,
            emailSent: emailResult.success,
            emailError: emailResult.success ? undefined : emailResult.message,
        });
    } catch (error) {
        console.error("Leave request error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
