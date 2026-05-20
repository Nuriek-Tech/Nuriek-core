import { describe, it, expect } from "vitest";
import {
    countInclusiveDays,
    countAccruedMonthsSinceJoin,
    computeProratedLeaveQuota,
    parseJoinCalendarDate,
    getLeavePeriod,
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

describe("parseJoinCalendarDate", () => {
    it("parses YYYY-MM-DD without UTC day shift", () => {
        const d = parseJoinCalendarDate("2025-12-04");
        expect(d?.getFullYear()).toBe(2025);
        expect(d?.getMonth()).toBe(11);
        expect(d?.getDate()).toBe(4);
    });
});

describe("getLeavePeriod", () => {
    it("keeps Dec 2025 join in first period through mid-2026", () => {
        const join = parseJoinCalendarDate("2025-12-04")!;
        const period = getLeavePeriod(join, new Date("2026-05-19"));
        expect(period?.isFirstPeriod).toBe(true);
        expect(period?.periodStart).toEqual(join);
    });

    it("starts new period on work anniversary", () => {
        const join = parseJoinCalendarDate("2025-12-04")!;
        const period = getLeavePeriod(join, new Date("2026-12-04"));
        expect(period?.isFirstPeriod).toBe(false);
    });
});

describe("countAccruedMonthsSinceJoin", () => {
    it("counts six months from Dec join through May", () => {
        const join = parseJoinCalendarDate("2025-12-04")!;
        expect(countAccruedMonthsSinceJoin(join, new Date("2026-05-19"))).toBe(6);
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

    it("returns full quota after first work anniversary", () => {
        const result = computeProratedLeaveQuota(annual, "2024-03-10", asOf);
        expect(result.isProrated).toBe(false);
        expect(result.entitled).toBe(22);
    });

    it("credits one month for December join in first month", () => {
        const result = computeProratedLeaveQuota(
            annual,
            "2025-12-04",
            new Date("2025-12-20")
        );
        expect(result.isProrated).toBe(true);
        expect(result.monthsCredited).toBe(1);
        expect(result.entitled).toBeCloseTo(22 / 12, 1);
        expect(result.nextAnniversary).toBe("2026-12-04");
    });

    it("stays prorated in 2026 until December anniversary", () => {
        const result = computeProratedLeaveQuota(annual, "2025-12-04", asOf);
        expect(result.isProrated).toBe(true);
        expect(result.monthsCredited).toBe(7);
        expect(result.entitled).toBeCloseTo((22 / 12) * 7, 1);
        expect(result.nextAnniversary).toBe("2026-12-04");
    });

    it("renews full quota on anniversary day", () => {
        const result = computeProratedLeaveQuota(
            annual,
            "2025-12-04",
            new Date("2026-12-04")
        );
        expect(result.isProrated).toBe(false);
        expect(result.entitled).toBe(22);
    });

    it("returns zero before join date", () => {
        const result = computeProratedLeaveQuota(annual, "2027-01-01", asOf);
        expect(result.entitled).toBe(0);
    });
});
