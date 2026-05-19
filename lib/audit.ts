import { prisma } from "@/lib/prisma";

export type AuditAction =
    | "USER_ONBOARD"
    | "USER_REPORTING_MANAGER_UPDATE"
    | "USER_DELETE"
    | "LOGIN"
    | "PASSWORD_CHANGE"
    | "DOCUMENT_UPLOAD"
    | "DOCUMENT_DELETE"
    | "DOCUMENT_SIGN"
    | "OFFER_EMAIL_SENT"
    | "OFFER_SIGNED"
    | "LEAVE_REQUEST"
    | "LEAVE_APPROVE"
    | "TIMESHEET_SUBMIT"
    | "TIMESHEET_APPROVE"
    | "ATTENDANCE_CHECK_IN"
    | "ATTENDANCE_CHECK_OUT"
    | "ATTENDANCE_BREAK"
    | "HR_ACCESS_UPDATE"
    | "OFFER_DELETE"
    | "OFFER_PURGE"
    | "OFFER_PURGE_ALL"
    | "OFFER_ONBOARDING_SENT"
    | "INTERN_CONVERT";

type AuditParams = {
    actorId?: string | null;
    actorEmail?: string | null;
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
};

export async function logAudit(params: AuditParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                actorId: params.actorId ?? null,
                actorEmail: params.actorEmail ?? null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId ?? null,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            },
        });
    } catch (error) {
        console.error("[Audit] Failed to write log:", error);
    }
}
