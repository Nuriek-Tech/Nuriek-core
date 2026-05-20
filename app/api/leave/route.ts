import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { getLeaveBalance, countInclusiveDays } from "@/lib/leave";
import { isLeaveExemptRole } from "@/lib/leave-approval";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/lib/constants";

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const leaves = await prisma.leave.findMany({
            where: { userId: user.id },
            orderBy: { startDate: "desc" },
        });

        const exempt = isLeaveExemptRole(user.role);
        const balance = exempt
            ? null
            : await getLeaveBalance(user.id, user.role as Role);

        return NextResponse.json({ leaves, balance, leaveExempt: exempt });
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
        const { type, startDate, endDate, reason } = body;

        if (!type || !startDate || !endDate) {
            return new NextResponse("Missing required fields", { status: 400 });
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
                reason,
                status: "PENDING",
            },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "LEAVE_REQUEST",
            entity: "Leave",
            entityId: leave.id,
            metadata: { type, days: requestedDays },
        });

        return NextResponse.json(leave);
    } catch (error) {
        console.error("Leave request error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
