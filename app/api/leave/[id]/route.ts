import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { canApproveLeaveRequest, canRevokeLeave } from "@/lib/leave-approval";
import { applyLeaveDecision } from "@/lib/leave-actions";
import { normalizeRole } from "@/lib/roles";
import type { Role } from "@/lib/constants";
import { invalidateLeaveApprovalTokens } from "@/lib/leave-approval-token";
import { logAudit } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const { id } = await params;

    try {
        const body = await req.json();
        const status = body.status as string;

        if (status !== "APPROVED" && status !== "REJECTED" && status !== "REVOKED") {
            return NextResponse.json(
                { error: "Status must be APPROVED, REJECTED, or REVOKED" },
                { status: 400 }
            );
        }

        const leave = await prisma.leave.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, reportsToId: true } },
            },
        });

        if (!leave) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        if (status === "REVOKED") {
            if (!canRevokeLeave(user.role)) {
                return NextResponse.json(
                    { error: "Only HR or Super Admin can revoke approved leave" },
                    { status: 403 }
                );
            }

            const result = await applyLeaveDecision({
                leaveId: id,
                status: "REVOKED",
                actorId: user.id,
                actorEmail: user.email,
                via: "portal",
            });

            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: result.status });
            }

            return NextResponse.json(result.leave);
        }

        if (leave.status !== "PENDING") {
            return NextResponse.json(
                { error: "This request was already processed" },
                { status: 400 }
            );
        }

        const requesterRole = normalizeRole(leave.user.role) as Role;
        if (!canApproveLeaveRequest(user.role, requesterRole, user.id, leave.user.reportsToId)) {
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

        const result = await applyLeaveDecision({
            leaveId: id,
            status,
            actorId: user.id,
            actorEmail: user.email,
            via: "portal",
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.leave);
    } catch (error) {
        console.error("Leave approval error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;
    const { id } = await params;
    const changed = await prisma.leave.updateMany({
        where: { id, userId: user.id, status: "PENDING" },
        data: { status: "CANCELLED" },
    });
    if (changed.count !== 1) return NextResponse.json({ error: "Only your pending requests can be cancelled" }, { status: 409 });
    await invalidateLeaveApprovalTokens(id);
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "LEAVE_CANCEL", entity: "Leave", entityId: id });
    return NextResponse.json({ success: true });
}
