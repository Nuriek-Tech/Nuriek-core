import { describe, it, expect } from "vitest";
import { parseHolidayList } from "./holiday-import";

describe("parseHolidayList", () => {
    it("parses CSV with header", () => {
        const { rows, errors } = parseHolidayList(
            "name,date,type\nDiwali,2026-11-08,PUBLIC"
        );
        expect(errors).toHaveLength(0);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.name).toBe("Diwali");
        expect(rows[0]?.date.getFullYear()).toBe(2026);
    });
});
