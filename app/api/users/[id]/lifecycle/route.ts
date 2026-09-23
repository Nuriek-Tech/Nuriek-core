import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import { OFFBOARDING_TASKS } from "@/lib/offboarding";

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const session = await requireSession();
    if (isNextResponse(session)) return session;
    const isAdmin = session.role === ROLES.FOUNDER || session.role === ROLES.HR_ADMIN;
    const isSelf = session.id === params.id;
    const directReport = !isAdmin && !isSelf && (session.role === ROLES.MANAGER || session.role === ROLES.TEAM_LEAD)
        ? await prisma.user.findFirst({ where: { id: params.id, reportsToId: session.id }, select: { id: true } })
        : null;

    if (!isAdmin && !isSelf && !directReport) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const userId = params.id;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, personalEmail: true, createdAt: true, isActive: true } });
        if (!user) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

        const [attendance, leaves, reviews, signatures] = await Promise.all([
            prisma.attendance.findMany({ where: { userId }, select: { id: true, checkIn: true, checkOut: true }, orderBy: { checkIn: "desc" }, take: 100 }),
            prisma.leave.findMany({ where: { userId }, select: { id: true, type: true, status: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
            prisma.performanceReview.findMany({ where: { userId }, select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
            prisma.signature.findMany({ where: { userId }, select: { id: true, signedAt: true, document: { select: { title: true } } }, orderBy: { signedAt: "desc" }, take: 50 }),
        ]);
        const relatedIds = [userId, ...attendance.map(item => item.id), ...leaves.map(item => item.id), ...reviews.map(item => item.id), ...signatures.map(item => item.id)];
        const logs = await prisma.auditLog.findMany({
            where: { entityId: { in: relatedIds } },
            select: { id: true, actorEmail: true, action: true, createdAt: true, entityId: true, metadata: true },
            orderBy: { createdAt: "desc" },
            take: 300,
        });

        // Also fetch any offer letters sent to them for earlier onboarding events
        let offerLetters: { id: string; createdAt: Date; emailedAt: Date | null; signedAt: Date | null; status: string }[] = [];
        if (user?.email || user?.personalEmail) {
            const emails = [user.email, user.personalEmail].filter(Boolean) as string[];
            if (emails.length > 0) {
                offerLetters = await prisma.offerLetter.findMany({
                    where: {
                        candidateEmail: { in: emails }
                    },
                    select: { id: true, createdAt: true, emailedAt: true, signedAt: true, status: true },
                    orderBy: { createdAt: "asc" }
                });
            }
        }

        const events: { id: string; at: Date; title: string; detail: string; category: string }[] = [
            { id: "record-created", at: user.createdAt, title: "Employee record created", detail: "Employee profile was added to the workforce.", category: "Lifecycle" },
        ];
        const actionNames: Record<string, string> = {
            USER_ONBOARD: "Onboarding started", ONBOARDING_EMAIL_SENT: "Welcome email sent", USER_ONBOARDING_COMPLETED: "Onboarding completed", USER_RECORD_UPDATE: "Employee record updated",
            USER_REPORTING_MANAGER_UPDATE: "Reporting manager updated", EMPLOYEE_EXITED: "Employee exited",
            USER_DEACTIVATED: "Employee deactivated", INTERN_CONVERT: "Converted to full-time",
            ATTENDANCE_CHECK_IN: "Checked in", ATTENDANCE_CHECK_OUT: "Checked out",
            ATTENDANCE_BREAK: "Attendance break updated", ATTENDANCE_CORRECT: "Attendance corrected",
            LEAVE_REQUEST: "Leave requested", LEAVE_CANCEL: "Leave cancelled",
            LEAVE_APPROVE: "Leave approved", LEAVE_REJECT: "Leave rejected", LEAVE_REVOKE: "Leave approval revoked",
            DOCUMENT_SIGN: "Document signed", DOCUMENT_UPLOAD: "Document uploaded",
            FINISH_LETTER_SENT: "Finish letter sent", PASSWORD_CHANGE: "Password changed",
            LOGIN: "Signed in", PASSWORD_RESET_REQUEST: "Password reset requested",
            PASSWORD_RESET_COMPLETE: "Password reset completed", TIMESHEET_SUBMIT: "Timesheet submitted",
            TIMESHEET_APPROVE: "Timesheet approved", HR_ACCESS_UPDATE: "HR access updated",
        };
        logs.forEach(log => {
            if (log.action === "OFFBOARDING_TASK_UPDATE") {
                try {
                    const data = JSON.parse(log.metadata || "{}");
                    const task = OFFBOARDING_TASKS.find(item => item.id === data.taskId);
                    if (task) events.push({ id: log.id, at: log.createdAt, title: `${task.title} ${data.done ? "completed" : "reopened"}`, detail: log.actorEmail ? `By ${log.actorEmail}` : "", category: "Exit" });
                } catch { /* ignore malformed audit metadata */ }
                return;
            }
            const title = actionNames[log.action] || log.action.toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
            const category = log.action.startsWith("ATTENDANCE") ? "Attendance" : log.action.startsWith("LEAVE") ? "Leave" : log.action.startsWith("DOCUMENT") ? "Document" : log.action === "LOGIN" || log.action.startsWith("PASSWORD") ? "Account" : log.action.startsWith("TIMESHEET") ? "Timesheet" : "Lifecycle";
            let detail = log.actorEmail ? `By ${log.actorEmail}` : "";
            if (isAdmin && log.action === "EMPLOYEE_EXITED") {
                try {
                    const reason = JSON.parse(log.metadata || "{}").reason;
                    if (typeof reason === "string" && reason) detail = `${reason}${detail ? ` · ${detail}` : ""}`;
                } catch { /* ignore malformed audit metadata */ }
            }
            events.push({ id: log.id, at: log.createdAt, title, detail, category });
        });
        attendance.forEach(item => {
            if (!logs.some(log => log.entityId === item.id && log.action === "ATTENDANCE_CHECK_IN")) events.push({ id: `checkin-${item.id}`, at: item.checkIn, title: "Checked in", detail: "", category: "Attendance" });
            if (item.checkOut && !logs.some(log => log.entityId === item.id && log.action === "ATTENDANCE_CHECK_OUT")) events.push({ id: `checkout-${item.id}`, at: item.checkOut, title: "Checked out", detail: "", category: "Attendance" });
        });
        leaves.forEach(item => {
            if (!logs.some(log => log.entityId === item.id && log.action === "LEAVE_REQUEST")) events.push({ id: `leave-${item.id}`, at: item.createdAt, title: "Leave requested", detail: item.type, category: "Leave" });
            if (item.updatedAt.getTime() > item.createdAt.getTime() + 1000 && !logs.some(log => log.entityId === item.id && log.action.startsWith("LEAVE_") && log.action !== "LEAVE_REQUEST")) events.push({ id: `leave-status-${item.id}`, at: item.updatedAt, title: `Leave ${item.status.toLowerCase()}`, detail: item.type, category: "Leave" });
        });
        reviews.forEach(item => events.push({ id: `review-${item.id}`, at: item.createdAt, title: "Performance review added", detail: "", category: "Performance" }));
        signatures.forEach(item => events.push({ id: `signature-${item.id}`, at: item.signedAt, title: "Document signed", detail: item.document.title, category: "Document" }));
        offerLetters.forEach(letter => {
            events.push({ id: `offer-${letter.id}`, at: letter.createdAt, title: "Offer letter created", detail: "", category: "Onboarding" });
            if (letter.emailedAt) events.push({ id: `offer-email-${letter.id}`, at: letter.emailedAt, title: "Offer letter sent", detail: "", category: "Onboarding" });
            if (letter.signedAt) events.push({ id: `offer-sign-${letter.id}`, at: letter.signedAt, title: "Offer letter signed", detail: "", category: "Onboarding" });
        });
        events.sort((a, b) => b.at.getTime() - a.at.getTime());
        return NextResponse.json({ events: events.slice(0, 300), hasMore: events.length > 300 });
    } catch {
        return NextResponse.json({ error: "Failed to fetch lifecycle" }, { status: 500 });
    }
}
