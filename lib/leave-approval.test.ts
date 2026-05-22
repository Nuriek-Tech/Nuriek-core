import { describe, it, expect } from "vitest";
import { canApproveLeave, canRevokeLeave, isLeaveExemptRole } from "./leave-approval";
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

describe("isLeaveExemptRole", () => {
    it("exempts Super Admin only", () => {
        expect(isLeaveExemptRole(ROLES.FOUNDER)).toBe(true);
        expect(isLeaveExemptRole(ROLES.HR_ADMIN)).toBe(false);
    });
});
