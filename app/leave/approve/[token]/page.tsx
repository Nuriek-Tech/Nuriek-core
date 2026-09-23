import { findLeaveApprovalToken } from "@/lib/leave-approval-token";
import LeaveApprovalConfirmation from "./LeaveApprovalConfirmation";
import "../../respond/leave-respond.css";

export default async function LeaveApprovePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const record = await findLeaveApprovalToken(token);
    if (!record || record.usedAt || record.expiresAt < new Date() || record.leave.status !== "PENDING") {
        return <main className="leaveRespondPage"><section className="leaveRespondCard"><h1>Link unavailable</h1><p>This approval link has expired or the request has already been decided.</p></section></main>;
    }
    return <LeaveApprovalConfirmation
        token={token}
        action={record.action === "APPROVE" ? "Approve" : "Reject"}
        employee={record.leave.user.name || record.leave.user.email || "Employee"}
        type={record.leave.type}
        startDate={record.leave.startDate.toLocaleDateString("en-IN")}
        endDate={record.leave.endDate.toLocaleDateString("en-IN")}
    />;
}
