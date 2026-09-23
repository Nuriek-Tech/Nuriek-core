import { describe, expect, it } from "vitest";
import { parseLeaveDate, validateLeaveInput } from "./leave-request";

describe("leave request validation", () => {
    it("rejects impossible dates and reversed ranges", () => {
        expect(parseLeaveDate("2026-02-30")).toBeNull();
        expect(validateLeaveInput({ type: "CASUAL", startDate: "2026-09-25", endDate: "2026-09-24" })).toMatchObject({ ok: false });
    });

    it("accepts an inclusive date range with a valid type", () => {
        const result = validateLeaveInput({ type: "SICK", startDate: "2026-09-23", endDate: "2026-09-23", reason: "  Unwell  " });
        expect(result).toMatchObject({ ok: true, type: "SICK", reason: "Unwell" });
    });

    it("rejects unsupported types and oversized reasons", () => {
        expect(validateLeaveInput({ type: "ADMIN", startDate: "2026-09-23", endDate: "2026-09-24" })).toMatchObject({ ok: false });
        expect(validateLeaveInput({ type: "SICK", startDate: "2026-09-23", endDate: "2026-09-24", reason: "x".repeat(1001) })).toMatchObject({ ok: false });
    });
});
