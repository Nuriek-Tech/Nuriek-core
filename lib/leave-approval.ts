import { ROLES, type Role, isSuperAdminRole } from "@/lib/constants";

/** Super Admin does not apply for leave or accrue balance. */
export function isLeaveExemptRole(role?: Role): boolean {
    return isSuperAdminRole(role);
}

/**
 * Who may approve a leave request (interim rules until manager workflow).
 * - HR Admin requests → Super Admin only
 * - Everyone else → Super Admin or HR Admin
 */
export function canApproveLeave(approverRole: Role, requesterRole: Role): boolean {
    if (requesterRole === ROLES.HR_ADMIN) {
        return approverRole === ROLES.FOUNDER;
    }
    return approverRole === ROLES.FOUNDER || approverRole === ROLES.HR_ADMIN;
}

export function leaveApprovalHint(requesterRole: Role): string {
    if (requesterRole === ROLES.HR_ADMIN) {
        return "Awaiting Super Admin approval";
    }
    return "Awaiting HR / Super Admin approval";
}

export function canReviewLeaveQueue(role: Role): boolean {
    return role === ROLES.FOUNDER || role === ROLES.HR_ADMIN;
}
