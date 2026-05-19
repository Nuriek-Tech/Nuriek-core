import { describe, it, expect } from "vitest";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
    it("allows requests under the limit", () => {
        const key = `test-${Date.now()}`;
        expect(checkRateLimit(key).allowed).toBe(true);
        resetRateLimit(key);
    });

    it("blocks after max attempts", () => {
        const key = `test-block-${Date.now()}`;
        for (let i = 0; i < 10; i++) {
            checkRateLimit(key);
        }
        const result = checkRateLimit(key);
        expect(result.allowed).toBe(false);
        expect(result.retryAfterSec).toBeGreaterThan(0);
        resetRateLimit(key);
    });
});
