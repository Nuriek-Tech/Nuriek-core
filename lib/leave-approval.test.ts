import { describe, it, expect } from "vitest";
import { canApproveLeave, canApproveLeaveRequest, canRevokeLeave, isLeaveExemptRole } from "./leave-approval";
import { ROLES } from "./constants";

describe("canApproveLeave", () => {
    it("requires Super Admin for HR leave", () => {
        expect(canApproveLeave(ROLES.FOUNDER, ROLES.HR_ADMIN)).toBe(true);
        expect(canApproveLeave(ROLES.HR_ADMIN, ROLES.HR_ADMIN)).toBe(false);
    });

    it("allows HR or Super Admin for employee leave", () => {
        expect(canApproveLeave(ROLES.HR_ADMIN, ROLES.EMPLOYEE)).toBe(true);
        expect(canApproveLeave(ROLES.FOUNDER, ROLES.EMPLOYEE)).toBe(true);
    });
});

describe("canRevokeLeave", () => {
    it("allows HR and Super Admin to revoke", () => {
        expect(canRevokeLeave(ROLES.FOUNDER)).toBe(true);
        expect(canRevokeLeave(ROLES.HR_ADMIN)).toBe(true);
        expect(canRevokeLeave(ROLES.EMPLOYEE)).toBe(false);
    });
});

describe("canApproveLeaveRequest", () => {
    it("limits manager approval to direct reports", () => {
        expect(canApproveLeaveRequest(ROLES.MANAGER, ROLES.EMPLOYEE, "manager-1", "manager-1")).toBe(true);
        expect(canApproveLeaveRequest(ROLES.MANAGER, ROLES.EMPLOYEE, "manager-2", "manager-1")).toBe(false);
    });

    it("reserves HR requests for Super Admin", () => {
        expect(canApproveLeaveRequest(ROLES.MANAGER, ROLES.HR_ADMIN, "manager-1", "manager-1")).toBe(false);
    });
});

describe("isLeaveExemptRole", () => {
    it("exempts Super Admin only", () => {
        expect(isLeaveExemptRole(ROLES.FOUNDER)).toBe(true);
        expect(isLeaveExemptRole(ROLES.HR_ADMIN)).toBe(false);
    });
});
