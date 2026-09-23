import { NextResponse } from "next/server";
import { findLeaveApprovalToken } from "@/lib/leave-approval-token";
import { applyLeaveDecision } from "@/lib/leave-actions";
import { portalEmailUrl } from "@/lib/portal-url";

type RouteParams = { params: Promise<{ token: string }> };

function resultRedirect(path: string) {
    return NextResponse.redirect(portalEmailUrl(path), { status: 303 });
}

export async function GET(_req: Request, { params }: RouteParams) {
    const { token } = await params;
    return NextResponse.redirect(portalEmailUrl(`/leave/approve/${encodeURIComponent(token)}`));
}

export async function POST(_req: Request, { params }: RouteParams) {
    const { token } = await params;

    try {
        const record = await findLeaveApprovalToken(token);

        if (!record) {
            return resultRedirect("/leave/respond/invalid");
        }

        if (record.usedAt) {
            return resultRedirect(`/leave/respond/used?status=${encodeURIComponent(record.leave.status)}`);
        }

        if (record.expiresAt < new Date()) {
            return resultRedirect("/leave/respond/expired");
        }

        const action = record.action === "APPROVE" ? "APPROVED" : "REJECTED";

        if (record.leave.status !== "PENDING") {
            return resultRedirect(`/leave/respond/used?status=${encodeURIComponent(record.leave.status)}`);
        }

        const result = await applyLeaveDecision({
            leaveId: record.leaveId,
            status: action,
            actorEmail: record.leave.reportingManagerEmail,
            via: "email",
        });

        if (!result.ok) {
            return resultRedirect("/leave/respond/error");
        }

        const employee = encodeURIComponent(result.employee.name || result.employee.email || "");
        const redirectPath =
            action === "APPROVED"
                ? `/leave/respond/approved?employee=${employee}`
                : `/leave/respond/rejected?employee=${employee}`;

        return resultRedirect(redirectPath);
    } catch (error) {
        console.error("[leave/respond]", error);
        return resultRedirect("/leave/respond/error");
    }
}
