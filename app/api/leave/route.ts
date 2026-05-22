import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { getLeaveBalance, countInclusiveDays } from "@/lib/leave";
import { isLeaveExemptRole, isValidReportingManagerEmail } from "@/lib/leave-approval";
import { logAudit } from "@/lib/audit";
import { createLeaveApprovalTokens, LEAVE_APPROVAL_EXPIRY_MS } from "@/lib/leave-approval-token";
import { sendLeaveApprovalRequestEmail } from "@/lib/mail";
import { portalEmailUrl } from "@/lib/portal-url";
import { normalizeWorkEmail } from "@/lib/email-policy";
import type { Role } from "@/lib/constants";

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
        const [leaves, dbUser] = await Promise.all([
            prisma.leave.findMany({
                where: { userId: user.id },
                orderBy: { startDate: "desc" },
            }),
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    reportsTo: { select: { email: true, name: true } },
                },
            }),
        ]);

        const exempt = isLeaveExemptRole(user.role);
        const balance = exempt
            ? null
            : await getLeaveBalance(user.id, user.role as Role);

        return NextResponse.json({
            leaves,
            balance,
            leaveExempt: exempt,
            defaultReportingManagerEmail: dbUser?.reportsTo?.email ?? null,
            defaultReportingManagerName: dbUser?.reportsTo?.name ?? null,
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
        const body = await req.json();
        const { type, startDate, endDate, reason, reportingManagerEmail } = body;

        if (!type || !startDate || !endDate) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const managerEmail = normalizeWorkEmail(String(reportingManagerEmail || ""));
        if (!managerEmail || !isValidReportingManagerEmail(managerEmail)) {
            return NextResponse.json(
                { error: "Enter a valid reporting manager email for approval." },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const requestedDays = countInclusiveDays(start, end);
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
                reason: reason ? String(reason).trim() : null,
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
            reason: reason ? String(reason).trim() : null,
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
