import { describe, it, expect } from "vitest";
import { countInclusiveDays, LEAVE_QUOTA_BY_ROLE } from "./leave";
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
