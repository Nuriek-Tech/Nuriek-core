import { describe, it, expect } from "vitest";
import { formatSessionDurationMs, sessionDurationMs } from "./session-tracking";

describe("formatSessionDurationMs", () => {
    it("formats minutes and hours", () => {
        expect(formatSessionDurationMs(45_000)).toBe("< 1 min");
        expect(formatSessionDurationMs(120_000)).toBe("2 min");
        expect(formatSessionDurationMs(3_600_000)).toBe("1h");
        expect(formatSessionDurationMs(5_400_000)).toBe("1h 30m");
    });
});

describe("sessionDurationMs", () => {
    it("uses logout when session ended", () => {
        const loginAt = new Date("2026-05-20T10:00:00");
        const logoutAt = new Date("2026-05-20T11:30:00");
        expect(
            sessionDurationMs({
                loginAt,
                logoutAt,
                lastActivityAt: logoutAt,
            })
        ).toBe(90 * 60_000);
    });
});
