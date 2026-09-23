import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { invalidateLeaveApprovalTokens } from "@/lib/leave-approval-token";

export type LeaveDecisionStatus = "APPROVED" | "REJECTED" | "REVOKED";

type ApplyLeaveDecisionParams = {
    leaveId: string;
    status: LeaveDecisionStatus;
    actorId?: string | null;
    actorEmail?: string | null;
    via: "portal" | "email";
};

export async function applyLeaveDecision({
    leaveId,
    status,
    actorId,
    actorEmail,
    via,
}: ApplyLeaveDecisionParams) {
    const leave = await prisma.leave.findUnique({
        where: { id: leaveId },
        include: {
            user: { select: { id: true, name: true, email: true, role: true } },
        },
    });

    if (!leave) {
        return { ok: false as const, error: "Leave request not found", status: 404 };
    }

    if (status === "REVOKED") {
        if (leave.status !== "APPROVED") {
            return {
                ok: false as const,
                error: "Only approved leave can be revoked",
                status: 400,
            };
        }

        const changed = await prisma.leave.updateMany({
            where: { id: leaveId, status: "APPROVED" },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
                revokedById: actorId ?? null,
            },
        });
        if (changed.count !== 1) return { ok: false as const, error: "This request was already processed", status: 409 };
        const updated = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });

        await invalidateLeaveApprovalTokens(leaveId);

        await logAudit({
            actorId,
            actorEmail,
            action: "LEAVE_REVOKE",
            entity: "Leave",
            entityId: leaveId,
            metadata: {
                employeeId: leave.userId,
                employeeEmail: leave.user.email,
                via,
            },
        });

        return { ok: true as const, leave: updated, employee: leave.user };
    }

    if (leave.status !== "PENDING") {
        return {
            ok: false as const,
            error: "This request was already processed",
            status: 400,
        };
    }

    const changed = await prisma.leave.updateMany({
        where: { id: leaveId, status: "PENDING" },
        data: {
            status,
            approvalActorEmail: actorEmail ?? null,
        },
    });
    if (changed.count !== 1) return { ok: false as const, error: "This request was already processed", status: 409 };
    const updated = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });

    await invalidateLeaveApprovalTokens(leaveId);

    await logAudit({
        actorId,
        actorEmail,
        action: status === "APPROVED" ? "LEAVE_APPROVE" : "LEAVE_REJECT",
        entity: "Leave",
        entityId: leaveId,
        metadata: {
            employeeId: leave.userId,
            employeeEmail: leave.user.email,
            requesterRole: leave.user.role,
            via,
        },
    });

    return { ok: true as const, leave: updated, employee: leave.user };
}
