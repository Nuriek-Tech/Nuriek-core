import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { canApproveLeave } from "@/lib/leave-approval";
import { normalizeRole } from "@/lib/roles";
import type { Role } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const { id } = await params;

    try {
        const body = await req.json();
        const status = body.status as string;

        if (status !== "APPROVED" && status !== "REJECTED") {
            return NextResponse.json(
                { error: "Status must be APPROVED or REJECTED" },
                { status: 400 }
            );
        }

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        if (!leave) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        if (leave.status !== "PENDING") {
            return NextResponse.json(
                { error: "This request was already processed" },
                { status: 400 }
            );
        }

        const requesterRole = normalizeRole(leave.user.role) as Role;
        if (!canApproveLeave(user.role, requesterRole)) {
            return NextResponse.json(
                {
                    error:
                        requesterRole === "HR_ADMIN"
                            ? "HR leave requests must be approved by Super Admin"
                            : "You cannot approve this leave request",
                },
                { status: 403 }
            );
        }

        const updated = await prisma.leave.update({
            where: { id },
            data: { status },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: status === "APPROVED" ? "LEAVE_APPROVE" : "LEAVE_REJECT",
            entity: "Leave",
            entityId: leave.id,
            metadata: {
                employeeId: leave.userId,
                employeeEmail: leave.user.email,
                requesterRole,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Leave approval error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
