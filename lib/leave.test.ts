import { describe, it, expect } from "vitest";
import {
    countInclusiveDays,
    computeProratedLeaveQuota,
    LEAVE_QUOTA_BY_ROLE,
} from "./leave";
import { ROLES } from "./constants";

describe("countInclusiveDays", () => {
    it("counts single day", () => {
        const d = new Date("2026-05-19");
        expect(countInclusiveDays(d, d)).toBe(1);
    });

    it("counts inclusive range", () => {
        const start = new Date("2026-05-19");
        const end = new Date("2026-05-21");
        expect(countInclusiveDays(start, end)).toBe(3);
    });
});

describe("LEAVE_QUOTA_BY_ROLE", () => {
    it("assigns lower quota to interns", () => {
        expect(LEAVE_QUOTA_BY_ROLE[ROLES.INTERN]).toBeLessThan(
            LEAVE_QUOTA_BY_ROLE[ROLES.EMPLOYEE]
        );
    });
});

describe("computeProratedLeaveQuota", () => {
    const annual = 22;
    const asOf = new Date("2026-06-15");

    it("returns full quota when joined before current year", () => {
        const result = computeProratedLeaveQuota(annual, "2024-03-10", asOf);
        expect(result.isProrated).toBe(false);
        expect(result.entitled).toBe(22);
    });

    it("prorates from mid-year join through 31 Dec", () => {
        const result = computeProratedLeaveQuota(annual, "2026-05-19", asOf);
        expect(result.isProrated).toBe(true);
        expect(result.entitled).toBeGreaterThan(0);
        expect(result.entitled).toBeLessThan(annual);
    });

    it("returns zero if join date is after current year", () => {
        const result = computeProratedLeaveQuota(annual, "2027-01-01", asOf);
        expect(result.entitled).toBe(0);
    });
});
